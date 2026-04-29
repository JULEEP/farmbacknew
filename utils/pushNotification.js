import admin from "../config/firebase.js";
import { User } from "../models/User.js";

export const sendPushToAllUsers = async (title, body) => {
  try {
    const users = await User.find({
      fcmToken: { $exists: true, $ne: null }
    });

    const tokens = users.map(u => u.fcmToken).filter(Boolean);

    if (!tokens.length) {
      console.log("No tokens found");
      return;
    }

    const message = {
      tokens,

      notification: {
        title,
        body,
      },

      // 🔥 HIGH PRIORITY CONFIG
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        }
      },

      apns: {
        payload: {
          aps: {
            sound: "default",
            contentAvailable: true
          }
        },
        headers: {
          "apns-priority": "10"
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("✅ Push sent:", response.successCount);

  } catch (err) {
    console.error("❌ Push error:", err.message);
  }
};