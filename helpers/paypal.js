require("dotenv").config();

const paypal = require("paypal-rest-sdk");

const { PAYPAL_MODE, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

// If any are missing, fail fast with a clear message
if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  throw new Error(
    "Missing PayPal credentials. Make sure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set in .env"
  );
}

paypal.configure({
  mode: PAYPAL_MODE,
  client_id: PAYPAL_CLIENT_ID,
  client_secret: PAYPAL_CLIENT_SECRET,
});

module.exports = paypal;
