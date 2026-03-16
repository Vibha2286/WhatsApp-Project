const axios = require("axios");

async function verifyID({ idnumber }) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/idverify`,
      { idNumber: idnumber } 
    );

    console.log("API Response:", response.data);
    return response.data;

  } catch (error) {
    console.log("API Error Messages:", error.response?.data?.messages);
    console.error("Verification Error:", error.message);
    throw error;
  }
}

async function verifyMobile({ idNumber, mobile }) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/mobile_verify`,
      {
        idNumber: idNumber,
        mobile: mobile
      }
    );

    console.log("API Response:", response.data);
    return response.data;

  } catch (error) {
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Message:", error.message);
    }

    throw error;
  }
}

async function sendOtp({ idNumber, mobile }) {
  try {
    console.log("Calling OTP API...", idNumber, mobile);

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/otp`,
      { idNumber, mobile }
    );

    console.log("OTP API Response:", response.data);
    return response.data;

  } catch (error) {
    console.error("OTP API Error:", error.message);
    throw error;
  }
}

async function verifyOtp({ idNumber, mobile, pin }) {
  try {
    console.log("Calling OTP PATCH API...", idNumber, mobile, pin);

    const response = await axios.patch(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/otp`,
      { idNumber, mobile, pin }
    );

    console.log("OTP Verify API Response:", response.data);
    return response.data;

  } catch (error) {
    console.error("OTP Verify API Error:", error.message);
    throw error;
  }
}

async function getOutcome({ idNumber, mobile, month, year, pin }) {
  try {
    console.log("Calling Outcome API...", idNumber, mobile, month, year, pin);

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/outcome`,
      {
        idNumber,
        mobile,
        month,
        year,
        pin
      }
    );

    console.log("Outcome API Response:", response.data);
    return response.data;

  } catch (error) {
    if (error.response) {
      console.error("Outcome API Error Status:", error.response.status);
      console.error("Outcome API Error Data:", error.response.data);
    } else {
      console.error("Outcome API Error Message:", error.message);
    }
    throw error;
  }
}

/**
 * Get WhatsApp Status
 */
async function getStatus({ idNumber, mobile, pin }) {
  try {
    console.log("Calling Status API...", idNumber, mobile, pin);

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/status`,
      { idNumber, mobile, pin }
    );

    console.log("Status API Response:", response.data);
    return response.data;

  } catch (error) {
    if (error.response) {
      console.error("Status API Error Status:", error.response.status);
      console.error("Status API Error Data:", error.response.data);
    } else {
      console.error("Status API Error Message:", error.message);
    }
    throw error;
  }
}

/**
 * Get WhatsApp Paydate
 */
async function getPayDate({ idNumber, mobile, month, year, pin }) {
  try {
    console.log("Calling Paydate API...", idNumber, mobile, month, year, pin);

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/paydate`,
      { idNumber, mobile, month, year, pin }
    );

    console.log("Paydate API Response:", response.data);
    return response.data;

  } catch (error) {
    if (error.response) {
      console.error("Paydate API Error Status:", error.response.status);
      console.error("Paydate API Error Data:", error.response.data);
    } else {
      console.error("Paydate API Error Message:", error.message);
    }
    throw error;
  }
}

module.exports = {
  verifyID,
  verifyMobile,
  sendOtp,
  verifyOtp,
  getOutcome,
  getStatus,
  getPayDate,
};
