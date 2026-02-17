const axios = require("axios");

async function verifyID({ idnumber })
 {
      const response = await axios.post(
    `${process.env.API_BASE_URL}/srd/api/whatsapp/idverify`,
    { idnumber }
  );

  return response.data;
}


module.exports = {
  verifyID
};
