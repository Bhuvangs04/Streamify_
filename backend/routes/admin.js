const express = require("express");
const nodemailer = require("nodemailer");
const { verifyToken, verifyAdmin } = require("../middleware/verify");
const userSchema = require("../models/User");
const paymentSchema = require("../models/Payment");
const RefundSchema = require("../models/RefundDetails");
const AmountTamp = require("../models/AmountTampering");
const payHistorySchema = require("../models/payhistory");
const movieSchema = require("../models/Movies");
const EmailChangeLog = require("../models/Email");
const router = express.Router();
require("dotenv").config();
const checkAdmin = require("../middleware/Admin");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendAccountStatusEmail = async (userEmail, userName, status) => {
  let subject = status ? "Account Suspended" : "Account Unlocked";
  let message = status
    ? "Your account has been temporarily locked due to suspicious activity."
    : "Your account has been successfully unlocked.";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: subject,
    html: `
      <h1>${subject}</h1>
      <p>Hello ${userName},</p>
      <p>${message}</p>
      <p>If this was not you, please contact support immediately.</p>
      <p>Best regards, <br>Your Support Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

router.get(
  "/user/email/change-logs",
  verifyToken,
  checkAdmin,
  verifyAdmin,
  async (req, res) => {
    try {
      const emailChangeLogs = await EmailChangeLog.find().populate(
        "userId",
        "username email userBlocked userTransfer"
      );
      return res.status(200).json({ emailChangeLogs });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

router.post(
  "/lock/account/:userId/:status",
  verifyToken,
  verifyAdmin,
  checkAdmin,
  async (req, res) => {
    try {
      const { userId, status } = req.params;
      const user = await userSchema.findById(userId);
      if (!user) {
        return res.status(403).send({ message: "No User Found" });
      }
      const details = await AmountTamp.findById({ userId: userId });

      user.AccountLocked = status;
      await user.save();
      if (details && user.AccountLocked === false) {
        details.status = "Resolved";
        await details.save();
      }
      if (details && user.AccountLocked === true) {
        details.status = "locked";
        await details.save();
      }
      await sendAccountStatusEmail(user.email, user.username, status);

      return res.status(200).send({ messsage: "Locked Successfuly" });
    } catch (error) {
      return res.status(503).json({ message: "Server broke" });
    }
  }
);

router.get(
  "/refund/payment/:paymentId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      const refund = await RefundSchema.findOne({
        PaymentId: paymentId,
      }).populate({
        path: "userId",
        select: "-password -wishlist", // Exclude 'password' and 'wishlist'
      });

      if (!refund) {
        return res.status(404).json({
          error:
            "If refund was done and It's not showing data, means we haven't got their details. Contact Razorpay support for further details.",
        });
      }

      // Extract user details
      const userDetails = refund.userId;

      const refundData = {
        success: true,
        refundDetails: {
          refundId: refund.RefundId,
          paymentId: refund.PaymentId,
          createdAt: refund.createdAt,
          status: refund.status,
        },
        userDetails: {
          username: userDetails.username,
          email: userDetails.email,
          role: userDetails.role,
          userBlocked: userDetails.userBlocked,
          createdAt: userDetails.createdAt,
          updatedAt: userDetails.updatedAt,
        },
      };

      // Respond with filtered data
      res.status(200).json(refundData);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
const SuspiciousOrder = require("../models/AmountTampering");
const suspiciousLoginSchema = require("../models/SuspiciousLogin");
const loginDetailSchema = require("../models/LoginDetails");

router.get("/Suspicous-Act", verifyAdmin, verifyToken, async (req, res) => {
  try {
    // Pagination parameters (default to page 1 and limit to 10 records per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the number of items to skip
    const skip = (page - 1) * limit;

    // Fetch suspicious orders with pagination
    const suspiciousOrders = await SuspiciousOrder.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Fetch suspicious logins with pagination
    const suspiciousLogins = await suspiciousLoginSchema
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ loginTime: -1 });

    // Fetch recent login details with pagination
    const recentLoginDetails = await loginDetailSchema
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ loginTime: -1 });

    // Get total count for pagination info
    const totalOrders = await SuspiciousOrder.countDocuments();
    const totalLogins = await suspiciousLoginSchema.countDocuments();
    const totalLoginDetails = await loginDetailSchema.countDocuments();

    // Calculate the total number of pages
    const totalPagesOrders = Math.ceil(totalOrders / limit);
    const totalPagesLogins = Math.ceil(totalLogins / limit);
    const totalPagesLoginDetails = Math.ceil(totalLoginDetails / limit);

    // Send response with pagination data
    return res.status(200).json({
      suspiciousOrders,
      suspiciousLogins,
      recentLoginDetails,
      pagination: {
        page,
        limit,
        totalOrders,
        totalLogins,
        totalLoginDetails,
        totalPagesOrders,
        totalPagesLogins,
        totalPagesLoginDetails,
      },
    });
  } catch (error) {
    console.error("Error fetching suspicious activities:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch suspicious activities" });
  }
});

router.get("/activeUsers", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const activeUsers = await userSchema
      .find({ role: "user" })
      .select(
        "-password -wishlist -resetPasswordExpires -resetPasswordToken -failedLoginAttempts -lockUntil "
      );
    const paymentDetails = await paymentSchema
      .find()
      .select("-Payment_ID  -WatchBy -Paid");
    const paymentHitory = await payHistorySchema.find();
    res.status(200).json({ activeUsers, paymentDetails, paymentHitory });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while fetching active users." });
  }
});

router.get("/payment-details/search", async (req, res) => {
  try {
    const { term } = req.query;

    if (!term) {
      return res.status(400).json({ error: "Search term is required." });
    }
    const results = await payHistorySchema.find({
      $or: [{ orderId: term }, { transactionId: term }],
    });

    if (results.length === 0) {
      return res.status(404).json({ message: "No matching records found." });
    }

    return res.status(200).json({ payments: results });
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while searching for payment details.",
    });
  }
});
router.post("/send/inactive/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userSchema.findOne({ _id: userId }); // Use `findOne` to get a single user
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const message = `
  <p>Dear <strong>${user.username}</strong>,</p>

  <p>This is a friendly reminder that the payment for your <strong>MiniNetflix subscription</strong> is overdue.</p>

  <p>To ensure uninterrupted access to your account, please complete the payment within the next <strong>7 days</strong>.</p>

  <p>If we do not receive payment by <strong>${new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toLocaleDateString()}</strong>, your account may be temporarily placed on hold until the balance is cleared.</p>

  <p>If you've already made the payment, please disregard this message.</p>

  <p>Should you have any questions or need assistance, feel free to <a href="mailto:movie.hive.2024@gmail.com" style="color: #007bff; text-decoration: none;">contact us</a>.</p>

  <p>Thank you for being a valued customer!</p>

  <p>Best regards,</p>
  <p><strong>MiniNetflix Team</strong></p>
`;

    await transporter.sendMail({
      to: user.email,
      subject: "📅 MiniNetflix Reminder: Upcoming Payment Due 💳",
      text: `
    Dear ${user.username}, 

    This is a friendly reminder that the payment for your MiniNetflix subscription is overdue. 
    To ensure uninterrupted access to your account, please complete the payment within the next 7 days. 

    If we do not receive payment by ${new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toLocaleDateString()}, 
    your account may be temporarily placed on hold until the balance is cleared.

    If you've already made the payment, please disregard this message. 
    Should you have any questions or need assistance, feel free to contact us.

    Thank you for being a valued customer!

    Best regards, 
    MiniNetflix Team
  `,
      html: message,
    });

    res.status(200).json({ message: "Reminder email sent successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while sending the email." });
  }
});

router.get(
  "/send/all/detailed/:date/fetchAll",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const userDetials = await userSchema
        .find()
        .select(
          "-password -wishlist -resetPasswordToken -resetPasswordExpires -userUpdated -failedLoginAttempts -lockUntil"
        );

      const PaymentDetails = await paymentSchema.find();
      const paymentHitory = await payHistorySchema.find();

      return res
        .status(200)
        .json({ userDetials, PaymentDetails, paymentHitory });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred while retriving details" });
    }
  }
);

router.post(
  "/send/:block/:userId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { userId, block } = req.params;

      // Validate the `block` parameter
      // const validBlocks = ["Blocked", "Unblocked"];
      // if (!validBlocks.includes(block)) {
      //   return res.status(400).json({
      //     message:
      //       "Invalid block status. Allowed values are 'Blocked' or 'Unblocked'.",
      //   });
      // }
      // Find and update the user, setting the `userBlocked` field
      const user = await userSchema.findByIdAndUpdate(
        userId,
        { userBlocked: block },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.status(200).json({
        message: `User successfully ${block.toLowerCase()}.`,
      });
    } catch (error) {
      res.status(500).json({
        message: "An error occurred while updating the user block status.",
      });
    }
  }
);

router.post(
  "/movie/uploaded/details",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const MovieDetails = await movieSchema.find({
        $or: [
          { status: "queued" },
          { status: "processing" },
          { status: "completed" },
        ],
      });
      if (MovieDetails) {
        return res.status(200).json({ MovieDetails });
      } else {
        return res.status(203).json({ message: "No Movie Found" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "An error occurred while reterival the movie." });
    }
  }
);

router.post(
  "/analytics/details",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const totalUsers = await userSchema.countDocuments({ role: "user" });
      const blockedUsers = await userSchema.countDocuments({
        userBlocked: "Blocked",
        role: "user",
      });
      const activeUsers = totalUsers - blockedUsers;
      const paidUsers = await paymentSchema.aggregate([
        {
          $group: {
            _id: "$userId",
            totalPaid: { $sum: { $toDouble: "$Paid" } },
          },
        },
      ]);
      const totalRevenue = paidUsers.reduce(
        (acc, user) => acc + user.totalPaid,
        0
      );
      const unpaidUsers = totalUsers - paidUsers.length;
      const currentDate = new Date();
      const activeSubscriptions = await paymentSchema.countDocuments({
        lastPaymentDate: {
          $gte: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            currentDate.getDate()
          ),
        },
      });
      const expiredSubscriptions = totalUsers - activeSubscriptions;
      const monthlySubscriptions = await paymentSchema.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            subscriptions: { $sum: 1 },
          },
        },
        {
          $project: {
            month: "$_id.month",
            year: "$_id.year",
            subscriptions: 1,
            _id: 0,
          },
        },
      ]);

      res.status(200).json({
        totalUsers,
        activeUsers,
        blockedUsers,
        totalRevenue,
        paidUsers: paidUsers.length,
        unpaidUsers,
        activeSubscriptions,
        expiredSubscriptions,
        monthlySubscriptions,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
