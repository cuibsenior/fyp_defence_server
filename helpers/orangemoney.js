/* require("dotenv").config(); */

// Stub: replace with Orange Money SDK usage
/* class OrangeMoney {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }
  initiatePayment({ amountFCFA, phone }) {
    // call Orange API...
    return Promise.resolve({ transactionId: "OM456", promptPin: true });
  }
}

module.exports = new OrangeMoney(
  process.env.ORANGE_MONEY_CLIENT_ID,
  process.env.ORANGE_MONEY_CLIENT_SECRET
); */

// server/helpers/orangemoney.js
require("dotenv").config();
const axios = require("axios");

const {
  ORANGE_ENVIRONMENT,
  ORANGE_BASE_URL,
  ORANGE_CLIENT_ID,
  ORANGE_CLIENT_SECRET,
} = process.env;

// Step 1: get OAuth token
async function getOrangeToken() {
  const url = `${ORANGE_BASE_URL}/oauth/v3/token`;
  const resp = await axios.post(
    url,
    new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    {
      auth: {
        username: ORANGE_CLIENT_ID,
        password: ORANGE_CLIENT_SECRET,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return resp.data.access_token;
}

async function initiatePayment({ amountFCFA, phone }) {
  const token = await getOrangeToken();
  const url = `${ORANGE_BASE_URL}/payment/v1/webpayment`;
  const body = {
    // depending on Orange’s API spec, the field names differ:
    amount: amountFCFA.toString(),
    currency: "XAF",
    msisdn: phone,
    callbackUrl: "https://yourdomain.com/api/shop/order/callback/orangemoney",
    // …other required fields per their doc…
  };

  const resp = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // Typically Orange returns a redirect URL or 202 code
  // Adjust these per the actual response structure.
  return {
    transactionId: resp.data.transactionId || resp.data.id,
    promptPin: true, // assume Orange prompts on device
    redirectUrl: resp.data.redirectUrl,
  };
}

module.exports = { initiatePayment };
