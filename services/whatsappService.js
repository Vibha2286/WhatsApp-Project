const axios = require("axios");
const { validateId, validateMobile, validatePin } = require("./validator");
const CONSTANTS = require("./constants");
const { verifyID, verifyMobile, sendOtp, verifyOtp, getOutcome, getStatus, sendMonthList, sendYearList } = require("./srdServices");


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
                    await sendText(from, "Please type 'HI' to start.");
                    session.step = 0;
                }
                break;

            case 1: // Ask for ID
                const beneficiaryID = validateId(text);

                if (beneficiaryID === null) {
                    console.log("Received ID:", text);
                    const verifyResult = await verifyID({ idnumber: text });

                    console.log(verifyResult.isValid);   // true
                    console.log(verifyResult.idNumber);  // "7804106370180"

                    if (verifyResult.isValid) {
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
                const isValidMobile = validateMobile(text);

                if (isValidMobile) {
                    session.mobile = text;

                    // Call mobile verification API
                    try {
                        const mobileResult = await verifyMobile({
                            idNumber: session.idNumber,  // from step 1
                            mobileNumber: text           // entered by user
                        });

                        if (mobileResult.isRegistered) {   // assuming API returns isValid
                            console.log("Mobile verified ✅", mobileResult);

                            const otpResult = await sendOtp({
                                idNumber: session.idNumber,
                                mobile: text
                            });

                            if (otpResult.status === "sent") {
                                console.log("OTP sent ✅", otpResult);
                                await sendText(from, CONSTANTS.ASK_PIN);
                                session.step = 3;
                            } else {
                                console.log("OTP sending failed", otpResult);
                                await sendText(from, "The OTP you entered is incorrect. Please check and try again.");
                                session.step = 2;
                            }

                        } else {
                            console.log("Mobile verification failed ❌", mobileResult);
                            await sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                            session.step = 2;
                        }
                    } catch (err) {
                        console.error("Error verifying mobile:", err.message);
                        await sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                        session.step = 2;
                    }

                } else {
                    session.step = 2;
                    await sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                }
                break;

            case 3: // Ask for OTP
                const isValidPin = validatePin(text);
                if (!isValidPin) {
                    await sendText(from, "Invalid PIN. Please enter a valid 6-digit PIN.");
                    session.step = 3;
                    break;
                }
                try {
                    const otpResult = await verifyOtp({
                        idNumber: session.idNumber,
                        mobile: session.mobile,
                        pin: text
                    });
                    if (otpResult.verified) {
                        console.log("OTP Verified:", otpResult);
                        await sendNumberedList(
                            from,
                            CONSTANTS.OPTIONS_MESSAGE,
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
                        session.step = 4;
                    } else {
                        console.log("OTP verification failed", otpResult);
                        await sendText(from, "The OTP you entered is incorrect. Please check and try again.");
                        session.step = 2;
                    }

                } catch (err) {
                    console.error("Error verifying OTP:", err.message);
                    await sendText(from, "The OTP you entered is incorrect. Please check and try again.");
                    session.step = 2;
                }
                break;

            case 4: // Handle menu selection
                switch (text) {
                    case "1":
                        const applicationStatus = await getStatus({
                            idNumber: session.idNumber,
                            mobile: session.mobile,
                            pin: text
                        });

                        if (applicationStatus.status) {
                            await sendText(from, `"${applicationStatus.status}"`);
                            session.step = 3;
                        } else {
                            await sendText(from, "Failed to retrieve application status.");
                            session.step = 3;
                        }
                        break;

                    case "2":
                        await sendText(from, CONSTANTS.RESPONSES["2"]);
                        session.step = 0;
                        break;

                    case "3":
                        await sendText(from, CONSTANTS.RESPONSES["3"]);
                        session.step = 0;
                        break;

                    default:
                        session.step = 3;
                        await sendNumberedList(
                            from,
                            "Invalid option. Reply with one of the menu numbers.",
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
                        break;
                }

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
    try {
        const response = await axios.post(
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
                            reply: {
                                id: b.id,
                                title: b.title
                            }
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

        console.log("Buttons sent successfully");
        return response.data;

    } catch (error) {
        console.error("WhatsApp Button Error:");
        console.error(JSON.stringify(error.response?.data, null, 2));
        throw error;
    }
}

/**
 * Send interactive list message
 */
async function sendNumberedList(to, message, rows) {
    try {
        // Build numbered list as text
        const listText = rows
            .map((r, index) => `${index + 1}. ${r.title}`)
            .join("\n");

        const finalMessage = `${message}\n\n${listText}`;

        const response = await axios.post(
            `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: {
                    body: finalMessage
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Numbered list sent successfully");
        return response.data;
    } catch (error) {
        console.error("WhatsApp Numbered List Error:");
        console.error(JSON.stringify(error.response?.data, null, 2));
        throw error;
    }
}

module.exports = {
    handleMessage,
};
