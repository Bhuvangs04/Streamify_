const express = require("express");
const multer = require("multer");
const path = require("path");
const movieSchema = require("../models/Movies");
const fs = require("fs");
const router = express.Router();
const historySchema = require("../models/History");
const paymentSchema = require("../models/Payment");
const userSchema = require("../models/User");
const { addToQueue } = require("../services/videoqueue");
const checkAdmin = require("../middleware/Admin");
const AWS = require("aws-sdk");
const { checkAccountLock } = require("../middleware/verify");


const storage = multer.memoryStorage();
const upload1 = multer({ storage: storage });

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

const upload = multer();

const userDeviceSchema = require("../models/Device");
const {
  verifyAdmin,
  verifyToken,
  decodeDeviceToken,
} = require("../middleware/verify");

router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const s3Client = new AWS.S3();

const s3 = new AWS.S3({
  accessKeyId: process.env.YOUR_ACCESS_KEY,
  secretAccessKey: process.env.YOUR_SECRET_KEY,
  region: process.env.YOUR_BUCKET_REGION,
});


router.post(
  "/upload-metadata",
  verifyAdmin,
  verifyToken,
  checkAdmin,
  upload.single("poster"),
  async (req, res) => {
    try {
      const { title, description, genre, director, releaseYear } = req.body;
      const posterFile = req.file;

      if (!title || !posterFile) {
        return res.status(400).json({
          success: false,
          message: "Title and poster are required.",
        });
      }

      // Upload poster to S3
      const posterKey = `posters/${title}/${posterFile.originalname}`;
      const posterUploadParams = {
        Bucket: process.env.YOUR_BUCKET_NAME,
        Key: posterKey,
        Body: posterFile.buffer,
        ContentType: posterFile.mimetype,
      };

      const posterUpload = await s3Client.upload(posterUploadParams).promise();

      // Save metadata and poster URL to MongoDB
      const movie = new movieSchema({
        title,
        description,
        genre,
        releaseYear,
        director,
        poster: {
          url: posterUpload.Location,
        },
        resolutions: [],
        status: "waiting_for_video", // Status until video upload is complete
      });

      await movie.save();

      res.status(200).json({
        success: true,
        message: "Metadata and poster uploaded successfully.",
        movieId: movie._id,
        movietitle: movie.title,
      });
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ success: false, message: "Metadata upload failed." });
    }
  }
);


const generateSignedUrl = (bucketName, objectKey, expiration = 3600) => {
  const decodedObjectKey = decodeURIComponent(objectKey);

  const params = {
    Bucket: bucketName,
    Key: decodedObjectKey, // Use the correctly decoded key
    Expires: expiration,
  };
  // Generate and return the signed URL
  return s3.getSignedUrl("getObject", params);
};

router.post(
  "/api/refresh-signed-url/:movieId",
  verifyToken,
  checkAdmin,
  verifyAdmin,
  async (req, res) => {
    const { movieId } = req.params;

    try {
      const movie = await movieSchema.findById(movieId);
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      // Map over resolutions and generate new signed URLs for index.m3u8
      const newResolutions = movie.resolutions.map((resolution) => {
        const objectKey = resolution.url
          .split("?")[0]
          .replace("https://sreamify.s3.ap-south-1.amazonaws.com/", "");
        console.log("Extracted object key:", objectKey);

        // Check if the current resolution's URL has expired
        if (new Date(resolution.expiresAt) <= new Date()) {
          // Generate a new signed URL for the index.m3u8 file
          const signedUrl = generateSignedUrl(
            process.env.AWS_BUCKET_NAME,
            objectKey
          );


          // Update the expiration time
          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + 3600); // Add 1 hour

          // Return the updated resolution object
          return {
            ...resolution,
            url: signedUrl,
            expiresAt: expiresAt,
          };
        }

        // If the URL has not expired, return the resolution as is
        return resolution;
      });

      // Update the movie document with the new resolutions
      movie.resolutions = newResolutions;
      await movie.save();


      // Return the updated movie object
      return res.json({ ...movie.toObject() });
    } catch (error) {
      console.error("Error refreshing signed URL:", error.message, error.stack);
      return res
        .status(500)
        .json({ message: "Error refreshing signed URL", error });
    }
  }
);



// Route for handling chunked video uploads
router.post(
  "/upload-chunk",
  verifyAdmin,
  verifyToken,
  checkAdmin,
  upload1.single("file"), // Use upload1.single for single file uploads
  async (req, res) => {
    const { chunkIndex, totalChunks, fileName, title } = req.body;
    const movieId = req.query.movieId;

    try {
      const chunkFile = req.file;

      // Check if all required parameters are provided
      if (
        !chunkFile ||
        !movieId ||
        !fileName ||
        !title ||
        chunkIndex === undefined ||
        totalChunks === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters.",
        });
      }

      const tempFolder = path.join(__dirname, "../temp", movieId);

      // Ensure the temporary folder for chunks exists
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }

      // Save the chunk data (buffer) to the corresponding chunk file
      const chunkPath = path.join(tempFolder, `chunk-${chunkIndex}`);
      fs.writeFileSync(chunkPath, chunkFile.buffer);

      // Get the list of already uploaded chunks
      const uploadedChunks = fs
        .readdirSync(tempFolder)
        .filter((file) => file.startsWith("chunk-"));

      // If all chunks are uploaded, merge them into the final video
      if (uploadedChunks.length === parseInt(totalChunks)) {
        const finalVideoPath = path.join(tempFolder, fileName);
        const writeStream = fs.createWriteStream(finalVideoPath);

        try {
          // Merge all the chunk files into the final video file
          for (let i = 0; i < totalChunks; i++) {
            const chunkData = fs.readFileSync(
              path.join(tempFolder, `chunk-${i}`)
            );
            writeStream.write(chunkData);
            // Optionally, delete each chunk after writing it
            fs.unlinkSync(path.join(tempFolder, `chunk-${i}`));
          }

          writeStream.end();
          writeStream.on("finish", async () => {
            try {
              // Upload the final video file to S3
              const videoKey = `videos/${title}/${fileName}`;
              const videoUploadParams = {
                Bucket: process.env.YOUR_BUCKET_NAME,
                Key: videoKey,
                Body: fs.createReadStream(finalVideoPath),
                ContentType: "video/mp4", // Adjust content type if necessary
              };

              const videoUpload = await s3.upload(videoUploadParams).promise();

              // Clean up temporary files
              fs.rmSync(tempFolder, { recursive: true, force: true });

              // Update movie status and URL in database
              const movie = await movieSchema.findById(movieId);
              if (!movie) {
                return res
                  .status(404)
                  .json({ success: false, message: "Movie not found." });
              }

              movie.status = "queued";
              movie.video = { url: videoUpload.Location };
              await movie.save();

              // Add the movie to the processing queue
              addToQueue({
                type: "video",
                title: movie.title,
                movieId: movie._id,
                inputFilePath: videoUpload.Location,
                resolutions: [
                  { quality: "1080p", width: 1920, height: 1080 },
                  { quality: "720p", width: 1280, height: 720 },
                ],
              });

              return res.status(200).json({
                success: true,
                message:
                  "All chunks uploaded, video uploaded to S3, and queued.",
                movie,
              });
            } catch (err) {
              console.error("Error during S3 upload or DB update:", err);
              return res.status(500).json({
                success: false,
                message: "Failed to upload video or update database.",
              });
            }
          });
        } catch (err) {
          console.error("Error merging chunks:", err);
          return res.status(500).json({
            success: false,
            message: "Error merging chunks.",
          });
        }
      } else {
        // If not all chunks are uploaded yet, send a success response with the number of uploaded chunks
        res.status(200).json({
          success: true,
          message: "Chunk uploaded successfully.",
          uploadedChunks: uploadedChunks.length,
          totalChunks,
        });
      }
    } catch (err) {
      console.error("Chunk upload error:", err);
      res.status(500).json({ success: false, message: "Chunk upload failed." });
    }
  }
);

router.post(
  "/publish/:input/:movieId/final",
  verifyAdmin,
  checkAdmin,
  async (req, res) => {
    try {
      const { movieId, input } = req.params;
      if (input !== "true" && input !== "false") {
        return res
          .status(400)
          .json({ message: "Invalid input value for publish status" });
      }
      const movie = await movieSchema.findById(movieId);
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      const updatedMovie = await movieSchema.findByIdAndUpdate(
        movieId,
        { publish: input },
        { new: true }
      );
      return res.status(200).json({
        message: `Publish status updated to ${updatedMovie.publish}`,
        publish: updatedMovie.publish,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Something went wrong, please try again later." });
    }
  }
);

router.get("/movies", verifyToken, checkAccountLock, async (req, res) => {
  try {
    const movies = await movieSchema.find({ publish: "true" });
    res.status(200).json({ success: true, movies });
  } catch (err) {
    res.status(500).send("Error fetching movies.");
  }
});


router.get(
  "/keys",
  verifyToken,
  checkAccountLock,
  decodeDeviceToken,
  async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const deviceToken = req.headers["authorization"];
    const { movieId, resolution } = req.query;

    if (!deviceToken) {
      return res.status(401).json({ status: false, message: "Unauthorized." });
    }

    try {
      // If the user's role is admin, bypass all checks and send the key path directly
      if (userRole === "admin") {
        const movie = await movieSchema.findOne({ _id: movieId });
        if (!movie) {
          return res
            .status(404)
            .json({ status: false, message: "Movie not found." });
        }

        const keyPath = path.join(
          __dirname,
          "uploads",
          movie.title,
          movieId,
          "chunks",
          resolution,
          "encryption.key"
        );

        return res.json({
          status: true,
          message: "Key access granted.",
          fileUrl: keyPath,
        });
      }

      // Check if the device token is associated with the correct user
      if (req.deviceDetails.userId !== req.user.userId) {
        return res
          .status(403)
          .json({ status: false, message: "Unauthorized device access." });
      }

      // Fetch the user's payment details
      const userPaymentDetails = await paymentSchema.findOne({ userId });

      // If no payment details are found or payment expired, respond with a message
      if (!userPaymentDetails) {
        return res
          .status(400)
          .json({
            status: false,
            message: "Please update the payment details.",
          });
      }

      // Check if the user's last payment date is within the allowed range
      const user = await userSchema.findById({ _id: userId });
      if (user) {
        const currentDate = new Date();
        const lastPaymentDate = new Date(user.lastPaymentDate);
        const diffInDays = Math.floor(
          (currentDate - lastPaymentDate) / (1000 * 3600 * 24)
        );
        if (diffInDays >= 35) {
          return res.status(400).json({
            status: false,
            message: "Please update the payment details.",
          });
        }
      } else {
        return res
          .status(404)
          .json({ status: false, message: "User not found." });
      }

      // Check if the user has already exceeded the allowed number of active devices
      const activeDevices = await userDeviceSchema.find({
        userId,
        isActive: true,
      });
      const userLimit = await paymentSchema.findOne({ userId });

      // Check if the user has reached their device limit
      if (userLimit && activeDevices.length > userLimit.WatchBy) {
        return res.status(400).json({
          status: false,
          message: `Your device limit ${userLimit.WatchBy} at a time.`,
        });
      }

      // Check if the device is actively streaming and authorized
      const activeDevice = await userDeviceSchema.findOne({
        userId: req.deviceDetails.userId,
        deviceId: req.deviceDetails.deviceId,
        isActive: true,
      });

      if (!activeDevice) {
        return res.status(403).json({
          status: false,
          message: "Device not authorized to access encryption key.",
        });
      }

      // Update the last accessed time for the device
      activeDevice.lastAccessed = Date.now();
      await activeDevice.save();

      // Validate the movie and resolution
      const movie = await movieSchema.findOne({ _id: movieId });
      if (!movie) {
        return res
          .status(404)
          .json({ status: false, message: "Movie not found." });
      }

      // Log the history of the user watching the movie
      const History = new historySchema({ userId, historyId: movieId });
      await History.save();
      // Send the encryption key file
      return res.json({
        status: true,
        message: "Key access granted.",
      });
    } catch (err) {
      return res.status(500).json({ status: false, message: "Server error." });
    }
  }
);



module.exports = router;
