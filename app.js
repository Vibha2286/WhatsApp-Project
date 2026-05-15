"use strict";

require("dotenv").config();
const express = require("express");
const { handleMessage } = require("./services/whatsappService");
const cron = require("node-cron");
const { ensureToken } = require("./services/graphServices");

const app = express();
app.use(express.json());

app.set('trust proxy', true);

// Health check
app.get("/", (req, res) => res.send("🚀 SASSA WhatsApp server is running!"));

// ----------------------------
// Initialize token at startup
// ----------------------------
(async () => {
  try {
    const token = await ensureToken();
    // console.log("Access token initialized:", token);
  } catch (err) {
    console.error("Error initializing token:", err);
    process.exit(1); // stop server if token cannot be initialized
  }
})();

// ----------------------------
// Cron job to refresh token daily at midnight
// ----------------------------
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running token refresh job...");
    const token = await ensureToken();
    console.log("Token refreshed:", token);
  } catch (err) {
    console.error("Token refresh failed:", err);
  }
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Query:", req.query);

  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  console.log("Webhook called at:", fullUrl);

  // Case 1: Health check (no query params)
  if (!mode) {
    console.log("Health check hit");
    return res.status(200).send("Webhook is live");
  }

  // Case 2: Verification request
  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verified successfully.", req.query);
    return res.status(200).send(challenge); // <- plain text
  }

  // Case 3: Invalid token
  console.error("Webhook verification failed.", req.query);
  return res.sendStatus(403);
});

// ----------------------------
// Receive WhatsApp messages
// ----------------------------

app.post("/webhook", async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;

    if (!value) return res.sendStatus(200);

    // statuses
    if (value.statuses) {
      value.statuses.forEach(status => {
        console.log("Status:", status);
      });
    }

    // messages
    const messages = value.messages;

    if (messages?.length) {
      for (const msg of messages) {
        try {
          await handleMessage(msg);
          await new Promise(res => setTimeout(res, 200)); // throttle
        } catch (err) {
          console.error("Message error:", err);
        }
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("EVENT_RECEIVED");
  }
});

// ----------------------------
// Start server
// ----------------------------
const PORT = process.env.PORT || 8482;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));