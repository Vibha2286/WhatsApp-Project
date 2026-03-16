
const RejectionReasons = require("./enum");

module.exports = Object.freeze({

  // First welcome message
  WELCOME_MESSAGE: "👋 Welcome to SASSA SRD R370 Whatsapp Service \nBy continuing, you agree that SASSA may use your information to verify your identity and provide your SRD status. \n\nPlease provide your South African ID number",

  // Next prompts
  ASK_MOBILE: "Please provide the mobile number you used when applying for your SRD R370 grant.",
  ASK_PIN: "Enter the OTP",

  //Error messages
  INVALID_ID_MESSAGE: "The ID you entered could not be found in our system. Please check the number and try again. if you have not registered for the SRD grant, please visit the SRD website to submit your application. \nwww.srd.sassa.gov.za",
  INVALID_MOBILE_NUMBER_MESSAGE: "The mobile number, you entered does not match the number used for your SRD application. Please try again.",
  INVALID_OTP_MESSAGE: "The OTP you entered is incorrect. Please check and  try again.",

  // Options message
  OPTIONS_MESSAGE: "Please select the option number",
  
  // Buttons for final menu
  REPLY_INTERACTIVE_WITH_MEDIA_CTAS: [
    { id: "1", title: "Application Status" },
    { id: "2", title: "Payment Status" },
    { id: "3", title: "Payment Done Date" }
  ],

  // Rejection messages
  REJECTION_MESSAGES: {
    [RejectionReasons.AGE_OUTSIDE_RANGE]: "You do not meet the age requirement (18–60 years).",

    [RejectionReasons.EXISTING_SASSA_GRANT]: "You are already receiving a SASSA grant.",

    [RejectionReasons.MEANS_INCOME_SOURCE_IDENTIFIED]: "Another income source was identified.",

    [RejectionReasons.NSFAS_REGISTERED]: "You are registered with NSFAS.",

    [RejectionReasons.UIF_REGISTERED]: "You are registered with UIF.",

    [RejectionReasons.GOV_PAYROLL_REGISTERED]: "You are registered on the government payroll.",

    [RejectionReasons.GOV_INCOME_SOURCE_IDENTIFIED]: "Government income was identified.",

    [RejectionReasons.GOV_EMPLOYEE_PENSION]: "A government employee pension was found.",

    [RejectionReasons.ALTERNATIVE_INCOME_SOURCE_IDENTIFIED]: "An alternative income source was identified.",

    [RejectionReasons.GOV_FACILITY]:  "You are supported by a government facility.",

    [RejectionReasons.SELF_EXCLUSIONARY_RESPONSE_FOUND]: "Your application response indicates you do not qualify.",

    [RejectionReasons.DEBTOR]: "Another financial support source was identified."
  }



});
