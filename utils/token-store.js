const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../token.json");

// Save token to file
function saveToken(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

// Read token from file
function getToken() {
    try {
        if (!fs.existsSync(FILE)) {
            console.log("Token file not found at:", FILE);
            return null;
        }

        const data = fs.readFileSync(FILE, "utf8");

        if (!data) {
            console.log("Token file empty");
            return null;
        }

        return JSON.parse(data);

    } catch (err) {
        console.error("Error reading token file:", err.message);
        return null;
    }
}

// Check if token needs renewal
function isTokenExpired(tokenData) {
    if (!tokenData || !tokenData.renewAt) return true;

    const now = new Date();
    const renewAt = new Date(tokenData.renewAt);

    return now >= renewAt;
}

module.exports = {
    saveToken,
    getToken,
    isTokenExpired
};