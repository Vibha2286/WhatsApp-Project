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
  // Initialize session if not exists
  if (!sessions[from]) sessions[from] = { step: 0 };

  const session = sessions[from];

  try {
    switch (session.step) {
      case 0: // Waiting for HI
        if (text === "hi" || text === "Hi" || text === "HI")  {
          await sendText(from, CONSTANTS.WELCOME_MESSAGE);
          session.step = 1;
        } else {
          await sendText(from, "Please type 'HI' to start.");
        }
        break;

      case 1: // Ask for ID
        // Validate South African ID: 13 digits
        if (/^\d{13}$/.test(text)) {
          session.idNumber = text;
          await sendText(from, CONSTANTS.ASK_MOBILE);
          session.step = 2;
        } else {
          await sendText(from, "❌ Invalid ID. Please enter a valid 13-digit South African ID number.");
        }
        break;

      case 2: // Ask for mobile number
        // Validate South African mobile: +27 followed by 9 digits or 0 followed by 9 digits
        if (/^(?:\+27|0)\d{9}$/.test(text)) {
          session.mobile = text;
          await sendText(from, CONSTANTS.ASK_PIN);
          session.step = 3;
        } else {
          await sendText(from, "❌ Invalid mobile number. Please enter a valid South African mobile number.");
        }
        break;

      case 3: // Ask for PIN
        // Validate 6-digit PIN
        if (/^\d{6}$/.test(text)) {
          session.pin = text;
          await sendButtons(from, CONSTANTS.OPTIONS_MESSAGE, CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS);
          session.step = 4;
        } else {
          await sendText(from, "❌ Invalid PIN. Please enter a 6-digit PIN.");
        }
        break;

      case 4: // Handle final menu selection
        if (["1", "2", "3"].includes(text)) {
          await sendText(from, CONSTANTS.RESPONSES[text]);
          session.step = 0; // Reset session after completion
        } else {
          // If user types invalid input, resend buttons
          await sendButtons(from, "Invalid option. Please choose 1, 2, or 3.", CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS);
        }
        break;

      default:
        await sendText(from, "Something went wrong. Please type 'HI' to restart.");
        session.step = 0;
    }
  } catch (err) {
    console.error("❌ Error sending message:", err.response?.data || err.message);
  }

  res.sendStatus(200);

});

// Helper: Send text message
async function sendText(to, message) {
  await axios.post(
    `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log(`💬 Replied to ${to}: ${message}`);
}

// Helper: Send interactive buttons
async function sendButtons(to, message, buttons) {
  await axios.post(
    `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message },
        action: {
          buttons: buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log(`💬 Replied to ${to}: Sent buttons`);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
