module.exports = Object.freeze({
  // First welcome message
  WELCOME_MESSAGE: "Welcome to SASSA! Please enter your ID number to continue.",

  // Next prompts
  ASK_MOBILE: "Thank you! Please enter your mobile number.",
  ASK_PIN: "Almost done. Please enter your PIN.",

  // Options message
  OPTIONS_MESSAGE: "Select an option:",
  
  // Buttons for final menu
  REPLY_INTERACTIVE_WITH_MEDIA_CTAS: [
    { id: "1", title: "1. Application Status" },
    { id: "2", title: "2. Payment Date" },
    { id: "3", title: "3. Payment Status" }
  ],

  // Responses for selected options
  RESPONSES: {
    "1": "✅ Your application is under review.",
    "2": "✅ Your next payment date is 25th Feb 2026.",
    "3": "✅ Your last payment was successfully processed."
  }
});
