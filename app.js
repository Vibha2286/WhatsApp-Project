"use strict";

require("dotenv").config();
const express = require("express");
const { handleMessage } = require("./services/whatsappService");
const CONSTANTS = require("./services/constants");

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("🚀 SASSA WhatsApp server is running!"));

// Webhook verification
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

// Receive messages
app.post("/webhook", async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.sendStatus(200);

  await handleMessage(message);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
