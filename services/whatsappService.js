const axios = require("axios");
const { validateId, validateMobile, validatePin } = require("./validator");
const CONSTANTS = require("./constants");
const { verifyID, verifyMobile, sendOtp, verifyOtp, getOutcome, getStatus, sendMonthList, sendYearList, sendMonthRangeList, getPayDate } = require("./srdServices");


// In-memory session store
const sessions = {};

/**
 * Process incoming WhatsApp message
 */
async function handleMessage(message) {
    const from = message.from;
    const text = message.text?.body?.trim();
    const listReplyId = message.interactive?.list_reply?.id;

    if (!text && !listReplyId) return;

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
                        session.selectedMenu = "PAYMENT_STATUS";
                        await sendYearList(from);
                        session.step = 5;
                        break;

                    case "3":
                        session.selectedMenu = "PAYMENT_DATE";
                        await sendYearList(from);
                        session.step = 5;
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
                break;

            case 5: // Waiting for year selection

                if (!listReplyId) {
                    await sendText(from, "Please select a year from the list.");
                    return;
                }

                session.selectedYear = listReplyId;

                await sendMonthRangeList(from);
                session.step = 6;
                break;

            case 6: // Waiting for month selection

                if (!listReplyId) {
                    await sendText(from, "Please select a range.");
                    return;
                }

                session.monthRange = listReplyId;

                if (listReplyId === "H1") {
                    await sendHalfMonths(from, ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"], session.selectedYear);
                } else {
                    await sendHalfMonths(from, ["JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], session.selectedYear);
                }

                session.step = 7;
                break;

            case 7: // Waiting for month

                if (!listReplyId) {
                    await sendText(from, "Please select a month.");
                    return;
                }

                session.selectedMonth = listReplyId;

                const year = session.selectedYear;
                const month = session.selectedMonth;

                if (session.selectedMenu === "PAYMENT_STATUS") {

                    const outcome = await getOutcome({
                        idNumber: session.idNumber,
                        mobileNumber: session.mobile,
                        month,
                        year,
                        pin: session.pin
                    });

                    if (outcome?.outcome == "approved") {
                        await sendText(from, `Your Payment status is Approved`);
                    } else if (outcome?.outcome == "declined") {
                        await sendText(from, `Your Payment status is Declined. Status: ${outcome.status}`);
                    } else if (outcome?.outcome == "pending") {
                        await sendText(from, `Your Payment status is Pending`);
                    } else if (outcome?.outcome == "referred") {
                        await sendText(from, `Your Payment has been Referred. Kindly use the link below to complete your identy verification process. \nhttps://srd.sassa.gov.za/sc19/ekyc/referredstatus`);
                    } else if (outcome?.outcome == "archived") {
                        await sendText(from, `Your Payment has been Archived. Kindly contact the SASSA call centre email: supportcenter@sassa.gov.za or ca;; 0800 60 10 11 for assistance.`);
                    } else if (outcome?.outcome == "canceled") {
                        await sendText(from, `Your Payment has been Canceled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate`);
                    } else {
                        await sendText(from, `Failed to retrieve outcome status.`);
                    }
                } else if (session.selectedMenu === "PAYMENT_DATE") {

                    const status = await getPayDate({
                        idNumber: session.idNumber,
                        mobileNumber: session.mobile,
                        month,
                        year,
                        pin: session.pin
                    });

                    if (!status.paid || status.paid.trim() === "") {
                        await sendText(from, "Your payment is not yet made for this month.");
                    } else {
                        // Format date nicely
                        const formattedDate = formatDate(status.paid); 
                        await sendText(from, `Your Payment Date: ${formattedDate}`);
                    }
                }
                session.step = 4;
                break;

            default:
                await sendText(from, "Something went wrong. Please type 'HI' to restart.");
                session.step = 0;
        }
    } catch (err) {
        console.error("Error handling message:", err.response?.data || err.message);
    }
}

function formatDate(dateStr) {
    // dateStr is like "20-2-2026"
    const [day, month, year] = dateStr.split("-").map(Number);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const formattedMonth = monthNames[month - 1]; // month is 1-indexed
    return `${day} ${formattedMonth}, ${year}`;
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

async function sendHalfMonths(to, months, year) {
    const rows = months.map(m => ({
        id: `${m}_${year}`,  // unique row id
        title: `${m.charAt(0) + m.slice(1).toLowerCase()}, ${year}` // e.g., Nov, 2022
    }));

    return axios.post(
        `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
            messaging_product: "whatsapp",
            to,
            type: "interactive",
            interactive: {
                type: "list",
                body: { text: "Select the month:" },
                action: {
                    button: "Choose Month",
                    sections: [{ title: "Months", rows }]
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
}

module.exports = {
    handleMessage,
};
