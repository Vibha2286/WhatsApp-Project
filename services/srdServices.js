const axios = require("axios");

async function verifyID({ idnumber }) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/idverify`,
      { idNumber: idnumber },
      { timeout: 10000 }
    );

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
      },
      { timeout: 10000 }
    );

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
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/otp`,
      { idNumber, mobile },
      { timeout: 10000 }
    );
    return response.data;

  } catch (error) {
    console.error("OTP API Error:", error.message);
    throw error;
  }
}

async function sendOtpBefore({ mobile }) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/web/otp`,
      { mobile },
      { timeout: 10000 }
    );
    //  console.error("Send OTP API Response: ", response);
    return response.data;

  } catch (error) {
    console.log(`URL: ${process.env.API_BASE_URL}/srdweb/api/web/otp`);
    console.error("OTP API Error:", error.message);
    throw error;
  }
}

async function verifyOtp({ idNumber, mobile, pin }) {
  try {
    const response = await axios.patch(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/otp`,
      { idNumber, mobile, pin },
      { timeout: 10000 }
    );
    return response.data;

  } catch (error) {
    console.error("OTP Verify API Error:", error.message);
    throw error;
  }
}


async function verifyOtpBefore({ mobile, pin }) {
  try {
    const response = await axios.patch(
      `${process.env.API_BASE_URL}srdweb/api/web/otp/max`,
      { mobile, pin },
      { timeout: 10000 }
    );
    //  console.error("Verify OTP API Response: ", response.data);
    return response.data;

  } catch (error) {
    console.error("OTP Verify API Error:", error.message);
    throw error;
  }
}

async function getOutcome({ idNumber, mobile, month, year, pin }) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/outcome`,
      {
        idNumber,
        mobile,
        month,
        year,
        pin
      },
      { timeout: 10000 }
    );

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

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/status`,
      { idNumber, mobile, pin },
      { timeout: 10000 }
    );
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

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/paydate`,
      { idNumber, mobile, month, year, pin },
      { timeout: 10000 }
    );

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
  sendOtpBefore,
  verifyOtp,
  verifyOtpBefore,
  getOutcome,
  getStatus,
  getPayDate,
};
