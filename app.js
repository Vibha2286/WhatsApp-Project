"use strict";

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const CONSTANTS = require("./services/constants");

const app = express();
app.use(express.json());

console.log("🔐 ACCESS_TOKEN prefix:", process.env.ACCESS_TOKEN?.slice(0, 20));
console.log("📞 PHONE_NUMBER_ID:", process.env.PHONE_NUMBER_ID);

// In-memory session store
const sessions = {};

// Health check
app.get("/", (req, res) => {
  res.send("🚀 SASSA WhatsApp server is running!");
});

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

// Receive WhatsApp messages
app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];
  if (!message) return res.sendStatus(200);

  const from = message.from;
  const text = message.text?.body?.trim();

  // Initialize session if not exists
  if (!sessions[from]) {
    sessions[from] = { step: 0 }; // 0: waiting for HI
  }

  const session = sessions[from];
  let reply;

  try {
    switch (session.step) {
      case 0: // Waiting for HI
        if (text && text.toUpperCase() === "HI") {
          reply = CONSTANTS.WELCOME_MESSAGE;
          session.step = 1;
        } else {
          reply = "Please type 'HI' to start.";
        }
        break;

      case 1: // Ask for ID
        session.idNumber = text;
        reply = CONSTANTS.ASK_MOBILE;
        session.step = 2;
        break;

      case 2: // Ask for mobile number
        session.mobile = text;
        reply = CONSTANTS.ASK_PIN;
        session.step = 3;
        break;

      case 3: // Ask for PIN
        session.pin = text;
        // Show final menu as interactive buttons
        try {
          await axios.post(
            `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: "whatsapp",
              to: from,
              type: "interactive",
              interactive: {
                type: "button",
                body: { text: CONSTANTS.OPTIONS_MESSAGE },
                action: {
                  buttons: CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS.map(cta => ({
                    type: "reply",
                    reply: { id: cta.id, title: cta.title }
                  }))
                }
              }
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
                "Content-Type": "application/json"
              }
            }
          );
          console.log(`💬 Replied to ${from}: Sent options buttons`);
        } catch (err) {
          console.error("❌ Error sending buttons:", err.response?.data || err.message);
        }
        session.step = 4;
        return res.sendStatus(200); // Exit early because buttons are sent
        break;

      case 4: // Handle final menu selection
        if (["1", "2", "3"].includes(text)) {
          reply = CONSTANTS.RESPONSES[text];
          session.step = 0; // Reset session after completion
        } else {
          reply = "Invalid option. Please choose 1, 2, or 3.";
        }
        break;

      default:
        reply = "Something went wrong. Please type 'HI' to restart.";
        session.step = 0;
    }

    // Send text reply
    if (reply) {
      await axios.post(
        `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: reply }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
      console.log(`💬 Replied to ${from}: ${reply}`);
    }
  } catch (err) {
    console.error("❌ Error sending message:", err.response?.data || err.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
