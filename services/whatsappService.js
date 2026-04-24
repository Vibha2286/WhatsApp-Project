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

    if (message.type !== "text" && !message.interactive) {
        return;
    }

    if (!text && !listReplyId && !buttonReplyId) return;

    const SESSION_TIMEOUT = 20 * 60 * 1000;
    const now = Date.now();


    if (!sessions[from]) {
        if (!text || !/^hi$/i.test(text)) {
            await FACEBOOKAPI.sendText(from, CONSTANTS.TYPE_HI);
            return;
        }

        sessions[from] = {
            step: 1,
            lastActivity: now
        };
        await FACEBOOKAPI.sendText(from, CONSTANTS.ASK_MOBILE);
        return;
    }

    const session = sessions[from];

    if (!session) return;

    const last = session.lastActivity || 0;

    if (now - last > SESSION_TIMEOUT) {
        delete sessions[from];
        await FACEBOOKAPI.sendText(from, CONSTANTS.TIMEOUT_MESSAGE);
        return;
    }

    session.lastActivity = now;

    try {
        switch (session.step) {
            case 1: // Ask for Mobile
             const inputMobile = getInput(message);
                if (inputMobile?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }

                const isValidMobile = VAIDATOR.validateMobile(text);

                console.log("Mobile Validate Response: ", isValidMobile);

                if (isValidMobile) {
                    try {
                        const otpResult = await SRDAPI.sendOtpBefore({
                            mobile: text
                        });

                        // console.log("Send OTP API Response:", otpResult);

                        if (otpResult.status === "sent") {
                            session.mobile = text;
                            await FACEBOOKAPI.sendText(from, CONSTANTS.ASK_PIN);
                            session.step = 2;
                        } else {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_MOBILE_NUMBER_ERROR);
                            session.step = 1;
                        }

                    } catch (error) {

                        const errorMessage = error?.response?.data?.message || error?.response?.data?.messages?.[0] || error.message || "unknown error";
                        console.error("OTP Flow Error:", errorMessage);
                        if (errorMessage == "send sms error") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.SMS_SENT_ERROR);
                        } else if (errorMessage == "interval exception") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INTERVAL_EXCEPTION);
                        } else if (errorMessage == "invalid token") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_TOKEN_ERROR);
                        }
                        session.step = 1;
                    }

                } else {
                    session.step = 1;
                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_MOBILE_NUMBER_ERROR);
                }

                break;

            case 2: // Ask for OTP
                const inputtext = getInput(message);
                if (inputtext?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }
                const isValidPin = VAIDATOR.validatePin(text);
                if (!isValidPin) {
                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_PIN);
                    session.step = 2;
                    break;
                }
                try {
                    const otpResult = await SRDAPI.verifyOtpBefore({
                        mobile: session.mobile,
                        pin: text
                    });
                    if (otpResult.verified) {
                        session.pin = text;
                        if (!session.idNumber) {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.ASK_ID_MESSAGE);
                            session.step = 3;
                        } else {
                            await FACEBOOKAPI.sendNumberedList(
                                from,
                                CONSTANTS.OPTIONS_MESSAGE,
                                CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                            );
                            session.step = 4;
                        }
                    } else {
                        await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_OTP_MESSAGE);
                        session.step = 2;
                    }

                } catch (error) {
                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_OTP_MESSAGE);
                    session.step = 2;
                }

                break;

            case 3: // Ask for ID Number
                const inputValue = getInput(message);
                if (inputValue?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }
                const beneficiaryID = VAIDATOR.validateId(text);
                if (beneficiaryID === null) {

                    try {
                        const verifyResult = await SRDAPI.verifyID({ idnumber: text });
                        if (verifyResult.isValid) {

                            // Call mobile verification API
                            try {
                                const mobileResult = await SRDAPI.verifyMobile({
                                    idNumber: text,
                                    mobile: session.mobile
                                });

                                if (mobileResult.isRegistered) {
                                    session.mobile = session.mobile;
                                    session.idNumber = text;
                                    await FACEBOOKAPI.sendNumberedList(
                                        from,
                                        CONSTANTS.OPTIONS_MESSAGE,
                                        CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                                    );
                                    session.step = 4;

                                } else {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_MOBILE_NUMBER_MESSAGE);
                                    session.step = 1;
                                }
                            } catch (error) {

                                const errorMessage = error?.response?.data?.message || error?.response?.data?.messages?.[0] || error.message || "unknown error";

                                if (errorMessage == "id mandatory") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_ENTER);
                                    session.step = 1;
                                } else if (errorMessage == "party not found") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                                    session.step = 1;
                                } else if (errorMessage == "mobile mandatory") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_MANDATORY);
                                    session.step = 1;
                                } else if (errorMessage == "Mobile number does not match the provided idnumber") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_NOT_MATCH_WITH_ID);
                                    session.step = 3;
                                } else {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_MOBILE_NUMBER_ERROR);
                                    session.step = 1;
                                }

                            }

                        } else {
                            session.step = 3;
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                        }
                    } catch (error) {
                        if (error.response?.data?.messages?.includes("party not found")) {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                        } else if (error.response?.data?.messages?.includes('id mandatory')) {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_ENTER);
                        }
                        session.step = 3;
                    }
                } else {
                    session.step = 3;
                    await FACEBOOKAPI.sendText(from, CONSTANTS.VALID_ID_NUMBER);
                }

                break;

            case 4:
                const userInput = getInput(message);

                if (userInput?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }

                if (!userInput) return;

                switch (userInput) {
                    case "1":

                        try {
                            const applicationStatus = await SRDAPI.getStatus({
                                idNumber: session.idNumber,
                                mobile: session.mobile,
                                pin: session.pin
                            });

                            if (applicationStatus.status) {
                                if (applicationStatus.status == "completed") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.APPICATION_COMPLETED);
                                } else if (applicationStatus.status == "incomplete" || applicationStatus.status == "bank_pending" || applicationStatus.status == "reapply_pending" || applicationStatus.status == "high_risk") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_INCOMPLETE);
                                } else if (applicationStatus.status == "cancelled") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_CANCELLED);
                                } else {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_FAILED);
                                }
                                await FACEBOOKAPI.sendConfirmationButtons(from);
                                session.step = 9;
                            } else {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_FAILED);
                                await FACEBOOKAPI.sendConfirmationButtons(from);
                                session.step = 9;
                            }
                        } catch (error) {
                            const errorMessage = error?.response?.data?.message || error?.response?.data?.messages?.[0] || error.message || "unknown error";
                            if (errorMessage == "id mandatory") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_ENTER);
                            } else if (errorMessage == "party not found") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                            } else if (errorMessage == "mobile mandatory") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_MANDATORY);
                            } else if (errorMessage == "Mobile number does not match the provided idnumber") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_NOT_MATCH);
                            } else if (errorMessage == "missing token") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.MISSING_TOKEN);
                            } else if (errorMessage == "invalid token") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_TOKEN_ERROR);
                            } else {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_FAILED);
                            }
                            session.step = 4;
                            await FACEBOOKAPI.sendNumberedList(
                                from,
                                CONSTANTS.OPTIONS_MESSAGE,
                                CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                            );
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

                    case "4":
                        await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_NUMBER_UPDATE);
                        await FACEBOOKAPI.sendConfirmationButtons(from);
                        session.step = 9;
                        break;

                    case "5":
                        await FACEBOOKAPI.sendText(from, CONSTANTS.BANK_NUMBER_UPDATE);
                        await FACEBOOKAPI.sendConfirmationButtons(from);
                        session.step = 9;
                        break;

                    default:
                        session.step = 4;
                        await FACEBOOKAPI.sendNumberedList(
                            from,
                            CONSTANTS.INVALID_OPTION,
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
                        break;
                }
                break;

            case 5: // Waiting for year selection
                const inputDate = getInput(message);
                if (inputDate?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }
                if (!listReplyId) {
                    await FACEBOOKAPI.sendText(from, "Please select a year from the list.");
                    return;
                }

                session.selectedYear = listReplyId;

                await FACEBOOKAPI.sendMonthRangeList(from);
                session.step = 6;
                break;

            case 6: // Waiting for month selection
                const inputRange = getInput(message);
                if (inputRange?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }

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
                const inputMonth = getInput(message);
                if (inputMonth?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }

                if (!listReplyId) {
                    await FACEBOOKAPI.sendText(from, "Please select a month.");
                    return;
                }

                session.selectedMonth = listReplyId;

                const year = session.selectedYear;
                const monthYear = session.selectedMonth;
                const monthAbbr = monthYear.split("_")[0];
                const month = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1).toLowerCase();

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
                                await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_APPROVED);
                            } else if (outcome?.outcome == "declined") {
                                const reasonMessage = CONSTANTS.REJECTION_MESSAGES[outcome.reason];
                                await FACEBOOKAPI.sendText(from, `Your Payment status is Declined. Reason: ${reasonMessage}`);
                            } else if (outcome?.outcome == "pending") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_PENDING);
                            } else if (outcome?.outcome == "referred") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_REFERRED);
                            } else if (outcome?.outcome == "archived") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_ARCHIVED);
                            } else if (outcome?.outcome == "canceled") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_CANCELED);
                            } else {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_FAILED);
                            }
                        } else {
                            if (outcome.status == "incomplete"
                                || outcome.status == "bank_pending"
                                || outcome.status == "reapply_pending"
                                || outcome.status == "high_risk") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_INCOMPLETE);
                            } else if (outcome.status == "cancelled") {
                                await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_CANCELLED);
                            }
                        }
                        await FACEBOOKAPI.sendConfirmationButtons(from);
                        session.step = 9;
                    } catch (error) {
                        session.step = 4;
                        const errorMessage = error?.response?.data?.message || error?.response?.data?.messages?.[0] || error.message || "unknown error";
                        if (errorMessage == "id mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_ENTER);
                        } else if (errorMessage == "party not found") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                        } else if (errorMessage == "mobile mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_MANDATORY);
                        } else if (errorMessage == "Mobile number does not match the provided idnumber") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_NOT_MATCH);
                        } else if (errorMessage == "missing token") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.MISSING_TOKEN);
                        } else if (errorMessage == "invalid token") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_TOKEN_ERROR);
                        } else if (errorMessage == "month mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.SELECT_MONTH);
                        } else if (errorMessage == "year mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.SELECT_YEAR);
                        } else if (errorMessage == "Period invalid") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_PERIOD);
                        } else if (errorMessage == "outcome not found") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.NO_OUTCOME_FOUND);
                        } else {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.NO_OUTCOME_FOUND);
                        }
                        session.step = 4;
                        await FACEBOOKAPI.sendNumberedList(
                            from,
                            CONSTANTS.OPTIONS_MESSAGE,
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );
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
                                await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_NOT_MADE);
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
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_PENDING);
                                } else if (payDatestatus?.outcome == "referred") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_REFERRED);
                                } else if (payDatestatus?.outcome == "archived") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_ARCHIVED);
                                } else if (payDatestatus?.outcome == "canceled") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.PAYMENT_CANCELED);
                                }
                            } else {
                                if (payDatestatus.status == "incomplete"
                                    || payDatestatus.status == "bank_pending"
                                    || payDatestatus.status == "reapply_pending"
                                    || payDatestatus.status == "high_risk") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_INCOMPLETE);
                                } else if (payDatestatus.status == "cancelled") {
                                    await FACEBOOKAPI.sendText(from, CONSTANTS.APPLICATION_CANCELLED);
                                }
                            }
                            await FACEBOOKAPI.sendConfirmationButtons(from);
                            session.step = 9;
                        }
                    } catch (error) {

                        const errorMessage = error?.response?.data?.message || error?.response?.data?.messages?.[0] || error.message || "unknown error";
                        if (errorMessage == "id mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_ENTER);
                        } else if (errorMessage == "party not found") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_ID_MESSAGE);
                        } else if (errorMessage == "mobile mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_MANDATORY);
                        } else if (errorMessage == "Mobile number does not match the provided idnumber") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.MOBILE_NOT_MATCH);
                        } else if (errorMessage == "missing token") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.MISSING_TOKEN);
                        } else if (errorMessage == "invalid token") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_TOKEN_ERROR);
                        } else if (errorMessage == "month mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.SELECT_MONTH);
                        } else if (errorMessage == "year mandatory") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.SELECT_YEAR);
                        } else if (errorMessage == "Period invalid") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_PERIOD);
                        } else if (errorMessage == "outcome not found") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.NO_OUTCOME_FOUND);
                        } else {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.NO_OUTCOME_FOUND);
                        }
                        session.step = 4;
                        await FACEBOOKAPI.sendNumberedList(
                            from,
                            CONSTANTS.OPTIONS_MESSAGE,
                            CONSTANTS.REPLY_INTERACTIVE_WITH_MEDIA_CTAS
                        );

                    }
                }
                break;

            case 8:
                const OTP = getInput(message);
                if (OTP?.toLowerCase() === "hi") {
                    await startSessionOnHi(from, sessions, Date.now());
                    return;
                }
                const otpResult = await SRDAPI.sendOtp({
                    idNumber: session.idNumber,
                    mobile: session.mobile
                });

                if (otpResult.status === "sent") {
                    await FACEBOOKAPI.sendText(from, CONSTANTS.ASK_PIN);
                    session.step = 2;
                } else {
                    await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_OTP_MESSAGE);
                    session.step = 8;
                }
                break;

            case 9: // Confirmation Step

                const input = getInput(message);

                if (!input) return;
                if (input === "YES_CONTINUE" || input.toLowerCase() === "yes") {

                    try {
                        const otpResult = await SRDAPI.sendOtp({
                            idNumber: session.idNumber,
                            mobile: session.mobile
                        });

                        if (otpResult.status === "sent") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.REENTER_PIN);
                            session.step = 2;
                        } else {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_MOBILE_NUMBER_ERROR);
                            session.step = 1;
                        }
                    } catch (error) {
                        const errorMessage = error?.response?.data?.message || error?.response?.data?.messages?.[0] || error.message || "unknown error";
                        if (errorMessage == "send sms error") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.SMS_SENT_ERROR);
                        } else if (errorMessage == "interval exception") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INTERVAL_EXCEPTION);
                        } else if (errorMessage == "invalid token") {
                            await FACEBOOKAPI.sendText(from, CONSTANTS.INVALID_TOKEN_ERROR);
                        }
                        session.step = 1;
                    }

                } else if (input === "CANCEL_CHAT" || input.toLowerCase() === "cancel") {

                    await FACEBOOKAPI.sendText(from, CONSTANTS.CANCEL_MESSAGE);
                    delete sessions[from];

                } else {
                    await FACEBOOKAPI.sendText(from, CONSTANTS.SELECT_YES_CANCEL);
                }

                break;

            default:
                // session.step = 0;
                session.step = 1;
                await FACEBOOKAPI.sendText(from, CONSTANTS.TYPE_HI);
        }


    } catch (error) {
        console.error("Error handling message:", error.response?.data || error.message);
    }
}

function formatDate(dateStr) {
    // dateStr is like "20-2-2026"
    const [day, month, year] = dateStr.split("-").map(Number);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const formattedMonth = monthNames[month - 1];
    return `${day} ${formattedMonth}, ${year}`;
}

async function startSessionOnHi(from, sessions, now) {
    delete sessions[from];
    sessions[from] = {
        step: 1,
        lastActivity: now
    };
    await FACEBOOKAPI.sendText(from, CONSTANTS.REENTER_MOBILE);
}

module.exports = {
    handleMessage,
};


setInterval(async () => {
    const now = Date.now();

    for (const key of Object.keys(sessions)) {
        const session = sessions[key];

        if (session && session.lastActivity) {
            if (now - session.lastActivity > 20 * 60 * 1000) {
                console.log(`Cleaning expired session for ${key}`);

                await FACEBOOKAPI.sendText(
                    key,
                    CONSTANTS.TIMEOUT_MESSAGE
                );
                session.timeoutSent = true;

                delete sessions[key];
            }
        }
    }
}, 1 * 60 * 1000);

function getInput(message) {
    return (
        message?.interactive?.list_reply?.id ||
        message?.interactive?.button_reply?.id ||
        message?.text?.body?.trim() ||
        null
    );
}