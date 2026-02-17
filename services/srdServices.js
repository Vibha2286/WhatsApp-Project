const axios = require("axios");

async function verifyID({ idnumber })
 {
      const response = await axios.post(
    `http://srdqaapishc01.sassa.local:7003//srd/api/whatsapp/idverify`,
    { idnumber }
  );

  return response.data;
}


module.exports = {
  verifyID
};
