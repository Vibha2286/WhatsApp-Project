const axios = require("axios");
const { validateId } = require("./validator");
const CONSTANTS = require("./constants");
const { verifyID } = require("./srdServices");


// In-memory session store
const sessions = {};

/**
 * Process incoming WhatsApp message
 */
async function handleMessage(message) {
    const from = message.from;
    const text = message.text?.body?.trim();
    if (!text) return;

    if (!sessions[from]) sessions[from] = { step: 0 };
    const session = sessions[from];

    try {
        switch (session.step) {
            case 0: // Waiting for HI
                if (/^hi$/i.test(text)) {
                    await sendText(from, CONSTANTS.WELCOME_MESSAGE);
                    session.step = 1;
                } else {
                    session.step = 0;
                    await sendText(from, "Please type 'HI' to start.");
                }
                break;

            case 1: // Ask for ID
                const validationResult = validateId(text);
                console.log("Validation Result:", validationResult);
                await sendText(validationResult);


                if (validationResult === null) {
                    const verifyResult = await verifyID({ idnumber: text });

                    console.log(verifyResult.isValid);   // true
                    console.log(verifyResult.status);    // "success"
                    console.log(verifyResult.message);   // "ID verification successful"
                    console.log(verifyResult.idNumber);  // "7804106370180"

                    if (verifyResult.isValid && verifyResult.status === "success") {
                        console.log("ID is verified ✅");
                        session.idNumber = text;
                        await sendText(from, CONSTANTS.ASK_MOBILE);
                        session.step = 2;
                    } else {
                        console.log("ID verification failed ❌");
                        session.step = 1;
                        await sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                    }
                } else {
                    session.step = 1;
                    await sendText(from, "Please enter a valid 13-digit South African ID number.");
                }
                break;

            case 2: // Ask for mobile
                if (/^(?:\+27|0)\d{9}$/.test(text)) {
                    session.mobile = text;
                    await sendText(from, CONSTANTS.ASK_PIN);
                    session.step = 3;
                } else {
                    session.step = 2;
                    await sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                }
                break;

            case 3: // Ask for PIN
                if (/^\d{6}$/.test(text)) {
                    session.pin = text;
                    await sendButtons(from, CONSTANTS.OPTIONS_MESSAGE, CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS);
                    session.step = 4;
                } else {
                    session.step = 3;
                    await sendText(from, "Invalid PIN. Please enter a 6-digit PIN.");
                }
                break;

            case 4: // Handle menu selection
                if (["1", "2", "3"].includes(text)) {
                    await sendText(from, CONSTANTS.RESPONSES[text]);
                    session.step = 0;
                } else {
                    session.step = 4;
                    await sendButtons(from, "Invalid option. Reply with one of the menu numbers.", CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS);
                }
                break;

            default:
                await sendText(from, "Something went wrong. Please type 'HI' to restart.");
                session.step = 0;
        }
    } catch (err) {
        console.error("Error handling message:", err.response?.data || err.message);
    }
}

/**
 * Send text message via WhatsApp Graph API
 */
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
    console.log(`Replied to ${to}: ${message}`);
}

/**
 * Send interactive buttons
 */
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
    console.log(`Replied to ${to}: Sent buttons`);
}

module.exports = {
    handleMessage,
};
