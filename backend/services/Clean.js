const cron = require("node-cron");
const UserDevice = require("../models/Device");
const otpSchema = require("../models/Otp");
const payHistorySchema = require("../models/payhistory");
dotenv = require("dotenv");

const BATCH_SIZE = 2; // Define a batch size for all operations

async function cleanupExpiredOtps() {
  try {
    const now = new Date();
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const expiredOtps = await otpSchema
        .find({
          isVerified: "false",
          expiresAt: { $lt: now },
        })
        .skip(skip)
        .limit(BATCH_SIZE);

      if (expiredOtps.length === 0) {
        hasMore = false;
        break;
      }

      const idsToDelete = expiredOtps.map((otp) => otp._id);
      const result = await otpSchema.deleteMany({ _id: { $in: idsToDelete } });

      skip += BATCH_SIZE;
    }
  } catch (err) {}
}

async function updateInactiveDevices() {
  try {
    const inactivityPeriod = process.env.INACTIVITY_PERIOD || 60 * 60 * 1000; // 10 minutes
    const now = new Date();
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const inactiveDevices = await UserDevice.find({
        isActive: true,
        lastAccessed: { $lt: new Date(now - inactivityPeriod) },
      })
        .skip(skip)
        .limit(BATCH_SIZE);

      if (inactiveDevices.length === 0) {
        hasMore = false;
        break;
      }

      const idsToUpdate = inactiveDevices.map((device) => device._id);
      const result = await UserDevice.updateMany(
        { _id: { $in: idsToUpdate } },
        { $set: { isActive: false } }
      );

      skip += BATCH_SIZE;
    }
  } catch (err) {}
}

async function updateFailedPayments() {
  try {
    const now = new Date();
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const pendingPayments = await payHistorySchema
        .find({
          status: "pending",
          updatedAt: { $lt: now },
        })
        .skip(skip)
        .limit(BATCH_SIZE);

      if (pendingPayments.length === 0) {
        hasMore = false;
        break;
      }

      const idsToUpdate = pendingPayments.map((payment) => payment._id);
      const result = await payHistorySchema.updateMany(
        { _id: { $in: idsToUpdate } },
        { $set: { status: "failed" } }
      );

      skip += BATCH_SIZE;
    }
  } catch (err) {}
}

function cronJobs() {
  let isRunning = false;

  const task = cron.schedule("*/10 * * * *", async () => {
    isRunning = true;
    try {
      await updateFailedPayments();
      await cleanupExpiredOtps();
      await updateInactiveDevices();
    } catch (err) {
    } finally {
      isRunning = false;
    }
  });

  process.on("SIGINT", () => {
    task.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    task.stop();
    process.exit(0);
  });
}

module.exports = cronJobs;
