const axios = require("axios");

async function verifyID({ idnumber }) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/idverify`,
      { idNumber: idnumber }  // FIXED
    );

    console.log("API Response:", response.data);
    return response.data;

  } catch (error) {
    console.error("Verification Error:", error.message);
    throw error;
  }
}

async function verifyMobile({ idNumber, mobileNumber }) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/mobile_verify`,
      {
        idNumber: idNumber,
        mobileNumber: mobileNumber
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
    console.log("Calling OTP API...", idNumber, mobile, pin);

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

async function getOutcome({ idNumber, mobileNumber, month, year, pin }) {
  try {
    console.log("Calling Outcome API...", idNumber, mobileNumber, month, year, pin);

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/outcome`,
      {
        idNumber,
        mobileNumber,
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
async function getStatus({ idNumber, mobileNumber, pin }) {
  try {
    console.log("Calling Status API...", idNumber, mobileNumber, pin);

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/status`,
      { idNumber, mobileNumber, pin }
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
async function getPayDate({ idNumber, mobileNumber, month, year, pin }) {
  try {
    console.log("Calling Paydate API...", idNumber, mobileNumber, month, year, pin);

    const response = await axios.post(
      `${process.env.API_BASE_URL}srdweb/api/whatsapp/paydate`,
      { idNumber, mobileNumber, month, year, pin }
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

async function sendYearList(to) {
  const years = [2025, 2026, 2027]; // keep ≤10 rows
  const rows = years.map(y => ({ id: y.toString(), title: y.toString() }));

  return axios.post(
    `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: "Select the year:" },
        action: {
          button: "Choose Year",
          sections: [{ title: "Years", rows }]
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

async function sendMonthList(to) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const rows = months.map(m => ({ id: m, title: m }));

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
  verifyID,
  verifyMobile,
  sendOtp,
  verifyOtp,
  getOutcome,
  getStatus,
  getPayDate,
  sendYearList,
  sendMonthList
};
