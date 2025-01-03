const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const movieSchema = require("../models/Movies");
const Queue = require("bull");

// Initialize Bull queue
const videoQueue = new Queue("video processing", {
  redis: { host: "127.0.0.1", port: 6379 },
  settings: {
    stalledInterval: 1000 * 60 * 5, // Check for stalled jobs every 5 minutes
    lockDuration: 1000 * 60 * 10, // Set lock duration to 10 minutes
    maxStalledCount: 3, // Retry a stalled job 3 times
  },
});



// Add a job to the queue
const addToQueue = (job) => {
  if (job.type === "video") {
    // Add video processing job
    videoQueue.add("video", job);
  }// } 
};



videoQueue.getFailed().then((failedJobs) => {
  failedJobs.forEach((job) => {
    job.retry(); // Retry failed jobs
  });
});


// Function to generate HLS .m3u8 playlists



const generateHLS = (
  inputFilePath,
  resolution,
  outputDir,
  movieId,
  title = "",
) => {
  return new Promise((resolve, reject) => {
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const resolutionPath = path.join(
      outputDir,
      `${resolution.width}x${resolution.height}`
    );
    if (!fs.existsSync(resolutionPath)) {
      fs.mkdirSync(resolutionPath, { recursive: true });
    }

    const playlistPath = path.join(resolutionPath, "index.m3u8");
    const segmentPath = path.join(resolutionPath, "segment_%03d.ts");

    // Generate encryption key and save it
    const encryptionKey = crypto.randomBytes(16);
    const encryptionKeyPath = path.join(resolutionPath, "encryption.key");
    fs.writeFileSync(encryptionKeyPath, encryptionKey);

    // Create a key info file for FFmpeg
    const keyInfoPath = path.join(resolutionPath, "key_info");
    const keyUri = `encryption.key`; // Serve the key via an API
    fs.writeFileSync(keyInfoPath, `api/keys/${movieId}/video/${resolution.width}x${resolution.height}/${keyUri}\n${encryptionKeyPath}\n`);

    ffmpeg(inputFilePath)
      .outputOptions([
        `-vf scale=${resolution.width}:${resolution.height}`, // Scale to the resolution
        "-c:v libx264",
        "-c:a aac",
        "-preset fast",
        "-crf 23",
        "-hls_time 30", // Segment duration in seconds
        "-hls_playlist_type vod",
        `-hls_segment_filename ${segmentPath}`,
        `-hls_key_info_file ${keyInfoPath}`, // Use the key info file for encryption
      ])
      .on("start", (cmd) => {
      })
      .on("end", () => {

        resolve({
          quality: `${resolution.width}x${resolution.height}`,
          playlistUrl: `/uploads/${title}/${movieId}/chunks/${resolution.width}x${resolution.height}/index.m3u8`,
        });
      })
      .on("error", (err) => {

        reject(err);
      })
      .save(playlistPath);
  });
};


// Process jobs in the queue
videoQueue.process("video",async (job, done) => {
  const { type,title,movieId, inputFilePath, resolutions } = job.data;
  try {
    // Define paths
    const outputDir = path.join(
      __dirname,
      "../uploads/",
      `${title}/${movieId}`,
      "chunks"
    );

    // Fetch the movie document from the database
    const movie = await movieSchema.findById({_id:movieId});
    if (!movie) {
      throw new Error("Movie not found in the database");
    }

    // Step 1: Generate HLS for each resolution (for video)
    const resolutionData = [];
    if (resolutions && resolutions.length > 0) {
      for (let resolution of resolutions) {
        const hlsData = await generateHLS(
          inputFilePath,
          resolution,
          outputDir,
          movieId,
          title,type
        );

        // Add resolution metadata
        resolutionData.push({
          quality: hlsData.quality,
          url: hlsData.playlistUrl,
        });
      }
    }

    // Step 2: Update the movie document with resolution data
 movie.resolutions = resolutionData;
 movie.status = "completed";

 // Use the `upsert` option to handle version mismatch
 const updatedMovie = await movie.save({ upsert: true });


    done();
  } catch (err) {
    done(err);
  }
});

// videoQueue.process("trailer",async (job, done) => {
//   const { type,title,movieId, inputFilePath, resolutions } = job.data;
//   try {
//     // Define paths for trailer encoding
//     const outputDir = path.join(
//       __dirname,
//       "../uploads",
//       `${title}/${movieId}`,
//       "trailerChunks/"
//     );

//     // Fetch the movie document from the database
//     const movie = await movieSchema.findById(movieId);
//     if (!movie) {
//       throw new Error("Movie not found in the database");
//     }

//     // Step 1: Generate HLS for trailer (only high resolution)
//     const trailerResolutionData = [];
//     if (resolutions && resolutions.length > 0) {
//       for (let resolution of resolutions) {
//         const hlsData = await generateHLS(
//           inputFilePath,
//           resolution,
//           outputDir,
//           movieId,
//           title,
//           type
//         );

//         // Add trailer resolution metadata
//         trailerResolutionData.push({
//           quality: hlsData.quality,
//           url: hlsData.playlistUrl,
//         });
//       }
//     }

//     // Step 2: Update the movie document with trailer data
//     const updatedMovie = await movieSchema.findByIdAndUpdate(
//       movieId,
//       {
//         $set: {
//           status: "video completed", // Set status to "completed" directly if trailer is processed
//         },
//         $push: {
//           trailer: trailerResolutionData, // Add trailer data to the trailer array
//         },
//       },
//       { new: true } // Return the updated document after the update
//     );
//     done();
//   } catch (err) {
//     done(err);
//   }
// });

module.exports = { addToQueue };
