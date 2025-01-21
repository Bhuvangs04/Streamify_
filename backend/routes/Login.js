const express = require("express");
const validator = require("validator");
const router = express.Router();
const axios = require("axios");
const logger = require("../services/logger");
require("dotenv").config();
const userSchema = require("../models/User");
const { verifyToken, verifyAdmin } = require("../middleware/verify");
const { createTokenForUser } = require("../middleware/Auth");
const checkAdmin = require("../middleware/Admin");
const loginDetailSchema = require("../models/LoginDetails");
const suspiciousLoginSchema = require("../models/SuspiciousLogin");
const CryptoJS = require("crypto-js");
const nodemailer = require("nodemailer");

const sendSuspiciousLoginEmail = async (userEmail, userName, details) => {
  try {
    // Configure your email transport
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Suspicious Login Attempt Detected",
      html: `
        <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f8f9fa;
        color: #333;
      }
      .email-container {
        max-width: 600px;
        margin: 30px auto;
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: #d9534f;
        color: #fff;
        padding: 20px;
        text-align: center;
        font-size: 24px;
      }
      .header img {
        width: 50px;
        margin-bottom: 5px;
      }
      .content {
        padding: 20px;
        line-height: 1.6;
      }
      .content h1 {
        color: #d9534f;
        font-size: 22px;
        text-align: center;
      }
      .content p {
        margin: 10px 0;
      }
      .details {
        background: #f9f9f9;
        border: 1px solid #ddd;
        padding: 15px;
        border-radius: 6px;
        margin-top: 15px;
      }
      .details ul {
        padding: 0;
        list-style: none;
        margin: 0;
      }
      .details ul li {
        margin: 5px 0;
        padding: 8px;
        background: #fdfdfe;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .details ul li strong {
        color: #333;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        padding: 15px;
        background: #f1f1f1;
        color: #555;
      }
      .footer a {
        color: #d9534f;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <img src="https://img.icons8.com/emoji/50/000000/warning-emoji.png" alt="Warning Icon" />
        Suspicious Login Attempt
      </div>
      <div class="content">
        <h1>Alert! Suspicious Login Detected</h1>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>
          We detected a suspicious login attempt on your account. Please review the
          details below:
        </p>
        <div class="details">
          <ul>
            <li><strong>IP Address:</strong> ${details.ipAddress}</li>
            <li><strong>City:</strong> ${details.city}</li>
            <li><strong>Country:</strong> ${details.country}</li>
            <li><strong>Device:</strong> ${details.deviceDetails.deviceType}</li>
            <li><strong>Platform:</strong> ${details.deviceDetails.platform}</li>
          </ul>
        </div>
        <p style="color: #d9534f; font-weight: bold;">
          If this wasn't you, please reset your password immediately and contact support.
        </p>
        <p style="color:blue; font-weight: bold;">Please Raise complaint after login. If required</p>
        <p>Stay safe,</p>
        <p><strong>Your Security Team</strong></p>
      </div>
      <div class="footer">
        <p>
          If you have questions, please contact our support team at
          <a href="mailto:movie.hive.2024@gmail.com">Contact Us</a>.
        </p>
      </div>
    </div>
  </body>
</html>

      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Suspicious login email sent to:", userEmail);
  } catch (error) {
    console.error("Error sending suspicious login email:", error);
  }
};

const SECRET_KEY = "SecureOnlyPassword";
router.post("/login", async (req, res) => {
  const { data, hash } = req.body;
  const email = data.email;
  const password = data.password;
  const deviceDetails = data.deviceDetails;
  const userIpDetails = data.locations;

  // Recalculate the hash for data integrity verification
  const dataString = JSON.stringify(data);
  const recalculatedHash = CryptoJS.HmacSHA256(dataString, SECRET_KEY).toString(
    CryptoJS.enc.Base64
  );

  if (recalculatedHash !== hash) {
    return res.status(400).json({ message: "Invalid data. Login failed." });
  }

  // Validate email format
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedPassword = validator.escape(password);

  try {
    const user = await userSchema.findOne({ email: sanitizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        message: "Account is locked. Try again after 15 minutes.",
      });
    }

    // Check password validity
    const isValidPassword = await user.isPasswordCorrect(sanitizedPassword); // Ensure this uses bcrypt.compare
    if (!isValidPassword) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }

      await user.save();
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Reset failed attempts and lock status
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Check for suspicious activity
    let isSuspicious = false;
    const lastLogin = await loginDetailSchema
      .findOne({ userId: user._id })
      .sort({ loginTime: -1 });

    if (
      lastLogin &&
      (lastLogin.ip !== userIpDetails.ip ||
        lastLogin.city !== userIpDetails.city ||
        lastLogin.country !== userIpDetails.country)
    ) {
      isSuspicious = true;
    }

    // Log suspicious activity
    if (isSuspicious) {
      const suspiciousEntry = new suspiciousLoginSchema({
        userId: user._id,
        userName: user.username,
        userEmail: user.email,
        ipAddress: userIpDetails.ip,
        city: userIpDetails.city,
        country: userIpDetails.country,
        tamperingType: "Login from new location/IP address",
        status: "success",
        failedLoginAttempts: user.failedLoginAttempts,
        isSuspicious: true,
        deviceDetails: deviceDetails,
        additionalInfo: "Suspicious login attempt due to new location/IP.",
        emailSended: false,
      });

      try {
        const emailDetails = {
          ipAddress: userIpDetails.ip,
          city: userIpDetails.city,
          country: userIpDetails.country,
          deviceDetails: deviceDetails,
        };
        await sendSuspiciousLoginEmail(user.email, user.username, emailDetails);
        suspiciousEntry.emailSended = true;
      } catch (error) {
        console.error("Error sending suspicious login email:", error);
      }

      await suspiciousEntry.save();
    }

    // Log the successful login
    const loginDetail = new loginDetailSchema({
      userId: user._id,
      username: user.username,
      status: "success",
      ip: userIpDetails.ip,
      network: userIpDetails.network,
      version: userIpDetails.version,
      city: userIpDetails.city,
      region: userIpDetails.region,
      regionCode: userIpDetails.region_code,
      country: userIpDetails.country,
      countryName: userIpDetails.country_name,
      countryCode: userIpDetails.country_code,
      countryCodeIso3: userIpDetails.country_code_iso3,
      countryCapital: userIpDetails.country_capital,
      countryTld: userIpDetails.country_tld,
      continentCode: userIpDetails.continent_code,
      inEu: userIpDetails.in_eu,
      postal: userIpDetails.postal,
      latitude: userIpDetails.latitude,
      longitude: userIpDetails.longitude,
      timezone: userIpDetails.timezone,
      utcOffset: userIpDetails.utc_offset,
      countryCallingCode: userIpDetails.country_calling_code,
      currency: userIpDetails.currency,
      currencyName: userIpDetails.currency_name,
      languages: userIpDetails.languages,
      countryArea: userIpDetails.country_area,
      countryPopulation: userIpDetails.country_population,
      asn: userIpDetails.asn,
      org: userIpDetails.org,
    });
    await loginDetail.save();

    // Generate token
    const token = await createTokenForUser(user);
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "None",
    };

    return res
      .status(200)
      .cookie("token", token, cookieOptions)
      .json({ message: "Login successful", role: user.role });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/verify-auth", verifyToken, async (req, res) => {
  if (req.user.userId) {
    return res.status(200).json({ message: "Authenticated" });
  } else {
    return res
      .status(403)
      .json({ message: "Please Enter the correct login credentails" });
  }
});

router.get(
  "/admin/verify-auth",
  verifyToken,
  verifyAdmin,
  checkAdmin,
  async (req, res) => {
    res.status(200).json({ Authenticated: "true" });
  }
);

module.exports = router;
