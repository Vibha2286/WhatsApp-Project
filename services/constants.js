module.exports = Object.freeze({
  // First welcome message
  WELCOME_MESSAGE: "Welcome to SASSA SRD R370 Whatsapp Service \n By continuing, you agree that SASSA may use your information to verify your identity and provide your SRD status. \n\n Please provide your South African ID number",

  // Next prompts
  ASK_MOBILE: "Please provide the mobile number you used when applying for your SRD R370 grant.",
  ASK_PIN: "Enter the OTP.",

  //Error messages
  INVALID_ID_MESSAGE: "The ID you entered is not found in our system. Please check the number and try again",
  INVALID_MOBILE_NUMBER_MESSAGE: "The mobile number, you entered does not match the number used for your SRD application. You have X attempts remaining Please try again.",
  INVALID_OTP_MESSAGE: "The OTP you entered is incorrect. You have X attempts remaining. Please try again.",

  // Options message
  OPTIONS_MESSAGE: "Please select the option number",
  
  // Buttons for final menu
  REPLY_INTERACTIVE_WITH_MEDIA_CTAS: [
    { id: "1", title: "1. Application Status" },
    { id: "2", title: "2. Payment Date" },
    { id: "3", title: "3. Payment Status" }
  ],

  // Responses for selected options
  RESPONSES: {
    "1": "Your application is under review.",
    "2": "Your next payment date is 25th Feb 2026.",
    "3": "Your last payment was successfully processed."
  }
});
