"use strict";

require("dotenv").config();
const express = require("express");
const { handleMessage } = require("./services/whatsappService");
const cron = require("node-cron");
const { ensureToken } = require("./services/graphServices");

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("🚀 SASSA WhatsApp server is running!"));

// ----------------------------
// Initialize token at startup
// ----------------------------
(async () => {
  try {
    const token = await ensureToken();
    console.log("✅ Access token initialized:", token);
  } catch (err) {
    console.error("❌ Error initializing token:", err);
    process.exit(1); // stop server if token cannot be initialized
  }
})();

// ----------------------------
// Cron job to refresh token daily at midnight
// ----------------------------
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("🕛 Running token refresh job...");
    const token = await ensureToken();
    console.log("✅ Token refreshed:", token);
  } catch (err) {
    console.error("❌ Token refresh failed:", err);
  }
});

// ----------------------------
// Webhook verification
// ----------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// ----------------------------
// Receive WhatsApp messages
// ----------------------------
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    await handleMessage(message);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling message:", err);
    res.sendStatus(500);
  }
});

// ----------------------------
// Start server
// ----------------------------
const PORT = process.env.PORT || 8482;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));