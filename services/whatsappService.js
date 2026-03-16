const CONSTANTS = require("./constants");
const FACEBOOKAPI = require("./graphServices");
const SRDAPI = require("./srdServices");
const VAIDATOR = require("./validator");

// In-memory session store
const sessions = {};

async function handleMessage(message) {
    const from = message.from;
    const text = message.text?.body?.trim();
    const listReplyId = message.interactive?.list_reply?.id;
    const buttonReplyId = message.interactive?.button_reply?.id;

    if (!text && !listReplyId && !buttonReplyId) return;

    if (!sessions[from]) sessions[from] = { step: 0 };
    const session = sessions[from];

    try {
        switch (session.step) {
            case 0: // Waiting for HI
                if (/^hi$/i.test(text)) {
                    await FACEBOOKAPI.sendText(from, CONSTANTS.WELCOME_MESSAGE);
                    session.step = 1;
                } else {
                    await FACEBOOKAPI.sendText(from, "Please type 'HI' to start.");
                    session.step = 0;
                }
                break;

            case 1: // Ask for ID
                const beneficiaryID = VAIDATOR.validateId(text);

                if (beneficiaryID === null) {

                    try {
                        const verifyResult = await SRDAPI.verifyID({ idnumber: text });
                        if (verifyResult.isValid) {
                            console.log("ID is verified");
                            session.idNumber = text;
                            await FACEBOOKAPI.sendText(from, CONSTANTS.ASK_MOBILE);
                            session.step = 2;
                        } else {
                            console.log("ID verification failed");
                            session.step = 1;
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                        }
                    } catch (err) {
                        if (err.response?.data?.messages?.includes("party not found")) {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                        } else if (err.response?.data?.messages?.includes('invalid identity')) {
                            await FACEBOOKAPI.sendText(from, "invalid name or surname");
                        } else if (err.response?.data?.messages?.includes('party already reapplied')) {
                            await FACEBOOKAPI.sendText(from, "grant application already active");
                        } else if (err.response?.data?.messages?.includes('invalid identify request')) {
                            await FACEBOOKAPI.sendText(from, "invalid request");
                        } else if (err.response?.data?.messages?.includes('party already in referred status')) {
                            await FACEBOOKAPI.sendText(from, "party already in referred status");
                        } else if (err.response?.data?.messages?.includes('missing token')) {
                            await FACEBOOKAPI.sendText(from, "Token is missing");
                        } else if (err.response?.data?.messages?.includes('invalid identify request')) {
                            await FACEBOOKAPI.sendText(from, "invalid request");
                        } else if (err.response?.data?.messages?.includes('Reverification exceeds the limit')) {
                            await FACEBOOKAPI.sendText(from, "Reverification exceeds the limit");
                        }
                        session.step = 1;
                    }
                } else {
                    session.step = 1;
                    await FACEBOOKAPI.sendText(from, "Please enter a valid 13-digit South African ID number.");
                }
                break;

            case 2: // Ask for mobile
                const isValidMobile = VAIDATOR.validateMobile(text);

                if (isValidMobile) {
                    session.mobile = text;

                    // Call mobile verification API
                    try {
                        const mobileResult = await SRDAPI.verifyMobile({
                            idNumber: session.idNumber,  // from step 1
                            mobile: text           // entered by user
                        });

                        if (mobileResult.isRegistered) {   // assuming API returns isValid
                            console.log("Mobile verified", mobileResult);
                            session.mobile = text;
                            try {
                                const otpResult = await SRDAPI.sendOtp({
                                    idNumber: session.idNumber,
                                    mobile: text
                                });

                                if (otpResult.status === "sent") {
                                    console.log("OTP sent", otpResult);
                                    session.mobile = text;
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.ASK_PIN);
                                    session.step = 3;
                                } else {
                                    console.log("OTP sending failed", otpResult);
                                    await FACEBOOKAPI.sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                                    session.step = 2;
                                }
                            } catch (err) {
                                console.error("Error verifying mobile:", err.message);
                                if (err.message == "invalid id number") {
                                    await FACEBOOKAPI.sendText(from, "invalid id number");
                                } else if (err.message == "invalid phone number") {
                                    await FACEBOOKAPI.sendText(from, "invalid phone number");
                                } else if (err.message == "interval exception") {
                                    await FACEBOOKAPI.sendText(from, "An OTP has already been sent. Please wait 15 minutes before requesting a new one");
                                } else if (err.message == "send sms error") {
                                    await FACEBOOKAPI.sendText(from, "failed to send sms, please try again later");
                                } else if (err.message == "party details not found") {
                                    await FACEBOOKAPI.sendText(from, "Beneficiary not found.");
                                }
                                session.step = 2;
                            }

                        } else {
                            console.log("Mobile verification failed ❌", mobileResult);
                            await FACEBOOKAPI.sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                            session.step = 2;
                        }
                    } catch (err) {
                        console.error("Error verifying mobile:", err.message);

                        if (err.message == "id mandatory") {
                            await FACEBOOKAPI.sendText(from, "Id number is mandatory");
                        } else if (err.message == "party details not found") {
                            await FACEBOOKAPI.sendText(from, "Beneficiary not found.");
                        } else if (err.message == "invalid identify request") {
                            await FACEBOOKAPI.sendText(from, 'We are unable to process your request. Please try again later');
                        } else if (err.message == "application is not completed") {
                            await FACEBOOKAPI.sendText(from, 'Your SRD grant application is incomplete ');
                        } else if (err.message == "invalid token") {
                            await FACEBOOKAPI.sendText(from, 'invalid pin');
                        } else if (err.message == "invalid bank details") {
                            await FACEBOOKAPI.sendText(from, 'Invalid bank details');
                        }
                        await FACEBOOKAPI.sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                        session.step = 2;
                    }

                } else {
                    session.step = 2;
                    await FACEBOOKAPI.sendText(from, "Invalid mobile number. Please enter a valid South African mobile number.");
                }
                break;

            case 3: // Ask for OTP
                const isValidPin = VAIDATOR.validatePin(text);
                if (!isValidPin) {
                    await FACEBOOKAPI.sendText(from, "Invalid PIN. Please enter a valid 6-digit PIN.");
                    session.step = 3;
                    break;
                }
                try {
                    const otpResult = await SRDAPI.verifyOtp({
                        idNumber: session.idNumber,
                        mobile: session.mobile,
                        pin: text
                    });
                    if (otpResult.verified) {
                        session.pin = text;
                        console.log("OTP Verified:", otpResult);
                        await FACEBOOKAPI.sendNumberedList(
                            from,
                            CONSTANTS.OPTIONS_MESSAGE,
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
                        session.step = 4;
                    } else {
                        console.log("OTP verification failed", otpResult);
                        await FACEBOOKAPI.sendText(from, "The OTP you entered is incorrect. Please check and try again.");
                        session.step = 3;
                    }

                } catch (err) {
                    console.error("Error verifying OTP:", err.message);
                    await FACEBOOKAPI.sendText(from, "The OTP you entered is incorrect. Please check and try again.");
                    session.step = 3;
                }
                break;

            case 4:
                switch (text) {
                    case "1":
                        console.error("ID", session.idNumber);
                        console.error("Mobile", session.mobile);
                        console.error("OTP:", session.pin);

                        try {
                            const applicationStatus = await SRDAPI.getStatus({
                                idNumber: session.idNumber,
                                mobile: session.mobile,
                                pin: session.pin
                            });

                            if (applicationStatus.status) {
                                if (applicationStatus.status == "completed") {
                                    await FACEBOOKAPI.sendText(from, `Application is Completed.`);
                                } else if (applicationStatus.status == "incomplete" || applicationStatus.status == "bank_pending" || applicationStatus.status == "reapply_pending" || applicationStatus.status == "high_risk") {
                                    await FACEBOOKAPI.sendText(from, `Your application is incomplete. Please complete is using the link below. \nhttps://srd.sassa.gov.za`);
                                } else if (applicationStatus.status == "cancelled") {
                                    await FACEBOOKAPI.sendText(from, `Your application is cancelled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate`);
                                } else {
                                    await FACEBOOKAPI.sendText(from, `Failed to retrieve application status.`);
                                }
                                await FACEBOOKAPI.sendConfirmationButtons(from);
                                session.step = 9;
                            } else {
                                await FACEBOOKAPI.sendText(from, "Failed to retrieve application status.");
                                await FACEBOOKAPI.sendConfirmationButtons(from);
                                session.step = 9;
                            }
                        } catch (error) {
                            console.error("Outcome API Error:", error.response?.data || error.message);
                            await FACEBOOKAPI.sendText(from, `Failed to retrieve application status.`);
                            await FACEBOOKAPI.sendNumberedList(
                                from,
                                CONSTANTS.OPTIONS_MESSAGE,
                                CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                            );
                            session.step = 4;
                        }
                        break;

                    case "2":
                        session.selectedMenu = "PAYMENT_STATUS";
                        await FACEBOOKAPI.sendYearList(from);
                        session.step = 5;
                        break;

                    case "3":
                        session.selectedMenu = "PAYMENT_DATE";
                        await FACEBOOKAPI.sendYearList(from);
                        session.step = 5;
                        break;

                    default:
                        session.step = 4;
                        await FACEBOOKAPI.sendNumberedList(
                            from,
                            "Invalid option. Reply with one of the menu numbers.",
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
                        break;
                }
                break;

            case 5: // Waiting for year selection

                if (!listReplyId) {
                    await FACEBOOKAPI.sendText(from, "Please select a year from the list.");
                    return;
                }

                session.selectedYear = listReplyId;

                await FACEBOOKAPI.sendMonthRangeList(from);
                session.step = 6;
                break;

            case 6: // Waiting for month selection

                if (!listReplyId) {
                    await FACEBOOKAPI.sendText(from, "Please select a range.");
                    return;
                }

                session.monthRange = listReplyId;

                if (listReplyId === "H1") {
                    await FACEBOOKAPI.sendHalfMonths(from, ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"], session.selectedYear);
                } else {
                    await FACEBOOKAPI.sendHalfMonths(from, ["JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], session.selectedYear);
                }

                session.step = 7;
                break;

            case 7: // Waiting for month

                if (!listReplyId) {
                    await FACEBOOKAPI.sendText(from, "Please select a month.");
                    return;
                }

                session.selectedMonth = listReplyId;

                const year = session.selectedYear;
                const monthYear = session.selectedMonth;
                const monthAbbr = monthYear.split("_")[0];
                const month = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1).toLowerCase();

                console.log(month.toUpperCase());

                if (session.selectedMenu === "PAYMENT_STATUS") {
                    try {
                        const outcome = await SRDAPI.getOutcome({
                            idNumber: session.idNumber,
                            mobile: session.mobile,
                            month: month.toUpperCase(),
                            year,
                            pin: session.pin
                        });

                        const status = outcome.status?.trim() ?? "";
                        if (status === "") {
                            if (outcome?.outcome == "approved") {
                                await FACEBOOKAPI.sendText(from, `Your Payment status is Approved`);
                            } else if (outcome?.outcome == "declined") {
                                const reasonMessage = CONSTANTS.REJECTION_MESSAGES[outcome.reason];
                                await FACEBOOKAPI.sendText(from, `Your Payment status is Declined. Reason: ${reasonMessage}`);
                            } else if (outcome?.outcome == "pending") {
                                await FACEBOOKAPI.sendText(from, `Your Payment status is Pending`);
                            } else if (outcome?.outcome == "referred") {
                                await FACEBOOKAPI.sendText(from, `Your Payment has been Referred. Kindly use the link below to complete your identy verification process. \nhttps://srd.sassa.gov.za/sc19/ekyc/referredstatus`);
                            } else if (outcome?.outcome == "archived") {
                                await FACEBOOKAPI.sendText(from, `Your Payment has been Archived. Kindly contact the SASSA call centre email: supportcenter@sassa.gov.za or ca;; 0800 60 10 11 for assistance.`);
                            } else if (outcome?.outcome == "canceled") {
                                await FACEBOOKAPI.sendText(from, `Your Payment has been Canceled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate`);
                            } else {
                                await FACEBOOKAPI.sendText(from, `Failed to retrieve outcome status.`);
                            }
                        } else {
                            if (outcome.status == "incomplete"
                                || outcome.status == "bank_pending"
                                || outcome.status == "reapply_pending"
                                || outcome.status == "high_risk") {
                                await FACEBOOKAPI.sendText(from, `Your application is incomplete. Please complete is using the link below. \nhttps://srd.sassa.gov.za`);
                            } else if (outcome.status == "cancelled") {
                                await FACEBOOKAPI.sendText(from, `Your application is cancelled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate`);
                            }
                        }
                        await FACEBOOKAPI.sendConfirmationButtons(from);
                        session.step = 9;
                    } catch (error) {
                        console.error("Outcome API Error:", error.response?.data || error.message);
                        await FACEBOOKAPI.sendText(from, `Outcome not found for the selected month.`);
                        await FACEBOOKAPI.sendNumberedList(
                            from,
                            CONSTANTS.OPTIONS_MESSAGE,
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
                        session.step = 4;
                    }

                } else if (session.selectedMenu === "PAYMENT_DATE") {

                    try {
                        const payDatestatus = await SRDAPI.getPayDate({
                            idNumber: session.idNumber,
                            mobile: session.mobile,
                            month: month.toUpperCase(),
                            year,
                            pin: session.pin
                        });

                        if (payDatestatus.outcome == "approved") {

                            if (!payDatestatus.paid || payDatestatus.paid.trim() === "") {
                                await FACEBOOKAPI.sendText(from, "Your payment is not yet made for this month.");
                                await FACEBOOKAPI.sendConfirmationButtons(from);
                                session.step = 9;
                            } else {
                                const formattedDate = formatDate(payDatestatus.paid);
                                await FACEBOOKAPI.sendText(from, `Your Payment Date: ${formattedDate}`);
                                await FACEBOOKAPI.sendConfirmationButtons(from);
                                session.step = 9;
                            }
                        } else {
                            const status = payDatestatus.status?.trim() ?? "";
                            if (status === "") {
                                if (payDatestatus?.outcome == "declined") {
                                    const reasonMessage = CONSTANTS.REJECTION_MESSAGES[payDatestatus.reason];
                                    await FACEBOOKAPI.sendText(from, `Your Payment status is Declined. Reason: ${reasonMessage}`);
                                } else if (payDatestatus?.outcome == "pending") {
                                    await FACEBOOKAPI.sendText(from, `Your Payment status is Pending`);
                                } else if (payDatestatus?.outcome == "referred") {
                                    await FACEBOOKAPI.sendText(from, `Your Payment has been Referred. Kindly use the link below to complete your identy verification process. \nhttps://srd.sassa.gov.za/sc19/ekyc/referredstatus`);
                                } else if (payDatestatus?.outcome == "archived") {
                                    await FACEBOOKAPI.sendText(from, `Your Payment has been Archived. Kindly contact the SASSA call centre email: supportcenter@sassa.gov.za or ca;; 0800 60 10 11 for assistance.`);
                                } else if (payDatestatus?.outcome == "canceled") {
                                    await FACEBOOKAPI.sendText(from, `Your Payment has been Canceled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate`);
                                }
                            } else {
                                if (payDatestatus.status == "incomplete"
                                    || payDatestatus.status == "bank_pending"
                                    || payDatestatus.status == "reapply_pending"
                                    || payDatestatus.status == "high_risk") {
                                    await FACEBOOKAPI.sendText(from, `Your application is incomplete. Please complete is using the link below. \nhttps://srd.sassa.gov.za`);
                                } else if (payDatestatus.status == "cancelled") {
                                    await FACEBOOKAPI.sendText(from, `Your application is cancelled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate`);
                                }
                            }
                            await FACEBOOKAPI.sendConfirmationButtons(from);
                            session.step = 9;
                        }
                    } catch (error) {
                        console.error("Outcome API Error:", error.response?.data || error.message);
                        await FACEBOOKAPI.sendText(from, `Outcome not found for the selected month.`);
                        await FACEBOOKAPI.sendNumberedList(
                            from,
                            CONSTANTS.OPTIONS_MESSAGE,
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
                        session.step = 4;
                    }
                }
                break;

            case 8:
                const otpResult = await SRDAPI.sendOtp({
                    idNumber: session.idNumber,
                    mobile: session.mobile
                });

                if (otpResult.status === "sent") {
                    console.log("OTP sent", otpResult);
                    await FACEBOOKAPI.sendText(from, CONSTANTS.ASK_PIN);
                    session.step = 3;
                } else {
                    await FACEBOOKAPI.sendText(from, "The OTP you entered is incorrect. Please check and try again.");
                    session.step = 8;
                }
                break;

            case 9: // Confirmation Step
                console.log("Button Reply ID:", buttonReplyId, "Message Type:", message.type);

                if (buttonReplyId === "YES_CONTINUE" || buttonReplyId === "Yes") {

                    session.step = 0;

                } else if (buttonReplyId === "CANCEL_CHAT" || buttonReplyId === "Cancel") {

                    await FACEBOOKAPI.sendText(from, "Thank you for using our SASSA WhatsApp service. Goodbye 👋");

                    // Clear session
                    delete sessions[from];

                } else {
                    await FACEBOOKAPI.sendText(from, "Please select Yes or Cancel.");
                }

                break;

            default:
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

module.exports = {
    handleMessage,
};
