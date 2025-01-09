const mongoose = require("mongoose");

const suspiciousOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status:{
    type:String,
    required:true
  },
  currency: {
    type: String,
    required: true,
  },
  tamperingType: {
    type: String,
    required: true,
  },
  isSuspicious: {
    type: Boolean,
    default: true,
  },
  additionalInfo: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SuspiciousOrder = mongoose.model(
  "SuspiciousOrder",
  suspiciousOrderSchema
);

module.exports = SuspiciousOrder;
