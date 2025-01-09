const mongoose = require("mongoose");

const suspiciousLoginSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  ipAddress: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  tamperingType: { type: String, required: true },
  loginTime: { type: Date, default: Date.now },
  tamperingAttempts: { type: Number, default: 1 },
  status: { type: String, enum: ["success", "failure"], default: "failure" },
  failedLoginAttempts: { type: Number, default: 0 }, // Track failed login attempts
  lastFailedLoginTime: { type: Date }, // Time of the last failed attempt
  isSuspicious: { type: Boolean, default: false }, // Flag for suspicious behavior
  deviceDetails: { type: Object }, // Store device details (userAgent, platform, etc.)
  additionalInfo: { type: String, default: "" },
  emailSended:{type:Boolean,default:false,required:true}, // Additional information related to the attempt
});

const SuspiciousLogin = mongoose.model(
  "SuspiciousLogin",
  suspiciousLoginSchema
);

module.exports = SuspiciousLogin;
