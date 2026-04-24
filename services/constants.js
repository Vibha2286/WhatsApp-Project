
const RejectionReasons = require("./enum");

module.exports = Object.freeze({

  
// First welcome message
  ASK_ID_MESSAGE: "Please provide your South African ID number.",
  TYPE_HI: "Please type 'HI' to start.",
  SELECT_YES_CANCEL: "Please select Yes or Cancel.",
  REENTER_MOBILE: "Please provide the mobile number you used when applying for your Covid19 SRD grant.",
 
  //Cancel Session
  CANCEL_MESSAGE: "Thank you for using the SASSA Covid19 SRD WhatsApp service. \n\nGoodbye 👋 \n\nTo start again, please type 'HI'.",
 
  // Next prompts
  ASK_MOBILE: "👋 Welcome to the SASSA Covid19 SRD Whatsapp Service \nBy continuing, you agree that SASSA may use your information to verify your identity and provide your SRD status. \n\nPlease provide the mobile number you used when applying for your Covid19 SRD grant.",
  ASK_PIN: "Enter the OTP",
  REENTER_PIN: "For security reasons, please enter the OTP sent to your registered mobile number.",
  MOBILE_NUMBER_UPDATE: "Please visit the SRD website to update your mobile number. \nhttps://srd.sassa.gov.za/sc19/mobile-number-update",
  BANK_NUMBER_UPDATE: "Please visit the SRD website to update your bank details. \nhttps://srd.sassa.gov.za/sc19/banking-details-update",

  //Error messages
  INVALID_ID_MESSAGE: "The ID you entered could not be found in our system. Please check the number and try again. If you have not registered for the SRD grant, please visit the SRD website to submit your application. \nwww.srd.sassa.gov.za",
  INVALID_MOBILE_NUMBER_MESSAGE: "The mobile number you entered does not match the number used for your SRD application. Please check the number and try again.",
  INVALID_OTP_MESSAGE: "The OTP you entered is incorrect. Please check and try again or type 'HI' to start.",
  INVALID_ID_ENTER: "Please enter your ID Number",
  INVALID_MOBILE_NUMBER_ERROR: "Invalid mobile number. Please enter a valid South African mobile number or type 'HI' to start.",
  SMS_SENT_ERROR: " An error occurred while sending the SMS. Please try again or type 'HI' to start.",
  INTERVAL_EXCEPTION: "An OTP has already been sent. Please wait 15 minutes before requesting a new one.",
  INVALID_TOKEN_ERROR: "The OTP you entered is incorrect. Please enter the correct OTP or type 'HI' to start.",
  MOBILE_MANDATORY: "Please enter your Mobile Number.",
  MOBILE_NOT_MATCH: "The Mobile Number you have entered is not correct. Please enter the Mobile Number used on your SRD grant application.",
  MOBILE_NOT_MATCH_WITH_ID: "The mobile number entered does not match the ID number. Please enter a valid ID number.",
  MISSING_TOKEN: "The token is missing from the request",
  INVALID_PIN: "Invalid PIN. Please enter a valid 6-digit PIN.",
  SELECT_MONTH: "Please select a Month from the list of options.",
  SELECT_YEAR: "Please select a Year from the list of options.",
  INVALID_PERIOD: "The Period you selected is invalid.",
  NO_OUTCOME_FOUND: "No outcome record was found for the specified period.",
 
  //Validation messages
  VALID_ID_NUMBER: "Please enter a valid 13-digit South African ID number or type 'HI' to start.",
 
  //Application Status messages
  APPICATION_COMPLETED: "Application is Completed.",
  APPLICATION_INCOMPLETE: "Your application is incomplete. Please complete it using the link below. \nhttps://srd.sassa.gov.za",
  APPLICATION_FAILED: "Failed to retrieve application status.",
  APPLICATION_CANCELLED: "Your application is cancelled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate",
 
  //Payment Status messages
  PAYMENT_APPROVED: "Your Payment status is Approved",
  PAYMENT_PENDING: "Your Payment status is Pending",
  PAYMENT_REFERRED: "Your Payment has been Referred. Kindly use the link below to complete your identity verification process. \nhttps://srd.sassa.gov.za/sc19/ekyc/referredstatus`",
  PAYMENT_ARCHIVED: "Your Payment has been Archived. Kindly contact the SASSA call centre email: supportcenter@sassa.gov.za or call 0800 60 10 11 for assistance.",
  PAYMENT_CANCELED: "Your Payment has been Canceled. Please use the following link to reinstate your application. \nhttps://srd.sassa.gov.za/sc19/reinstate",
  PAYMENT_FAILED: "Failed to retrieve outcome status.",
  PAYMENT_NOT_MADE: "Your payment is not yet made for this month.",
 
  // Options message
  OPTIONS_MESSAGE: "Please select the option number",
  INVALID_OPTION: "Invalid option. Please use one of the menu number options.",
  // Buttons for final menu
  REPLY_INTERACTIVE_WITH_MEDIA_CTAS: [
    { id: "1", title: "Application Status" },
    { id: "2", title: "Payment Status" },
    { id: "3", title: "Payment Date" },
    { id: "4", title: "Change of Mobile number" },
    { id: "5", title: "Change of Method of Payment" }
  ],

  // Timeout message
  TIMEOUT_MESSAGE: "We have observed that we have not received a response from you. Therefore, we will proceed to close this chat. Please contact us once you are available to inform us of how you would like us to assist you further. \n\nSASSA SRD. \n\nPlease type 'HI' to start again.",

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

    [RejectionReasons.GOV_FACILITY]: "You are supported by a government facility.",

    [RejectionReasons.SELF_EXCLUSIONARY_RESPONSE_FOUND]: "Your application response indicates you do not qualify.",

    [RejectionReasons.DEBTOR]: "Another financial support source was identified."
  }

});
