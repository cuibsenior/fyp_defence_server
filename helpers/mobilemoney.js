/* require("dotenv").config(); */

// Stub: replace with real SDK/client
/* class MobileMoney {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  initiatePayment({ amountFCFA, phone }) {
    // call provider API...
    return Promise.resolve({ transactionId: "MM123", promptPin: true });
  }
}

module.exports = new MobileMoney(process.env.MOBILE_MONEY_API_KEY); */

// server/helpers/mobilemoney.js
require("dotenv").config();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const referenceId = uuidv4(); // generates a fresh, random UUID each call

const {
  MOMO_ENVIRONMENT,
  MOMO_API_USER_ID,
  MOMO_API_USER_SECRET,
  MOMO_SUBSCRIPTION_KEY,
} = process.env;

// Base URLs
const baseUrls = {
  sandbox: "https://sandbox.momodeveloper.mtn.com",
  production: "https://momodeveloper.mtn.com",
};

const BASE_URL = baseUrls[MOMO_ENVIRONMENT];

async function getAccessToken() {
  const url = `${BASE_URL}/collection/token/`;
  const creds = Buffer.from(
    `${MOMO_API_USER_ID}:${MOMO_API_USER_SECRET}`
  ).toString("base64");
  const resp = await axios.post(
    url,
    {},
    {
      headers: {
        Authorization: `Basic ${creds}`,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
    }
  );
  return resp.data.access_token;
}

async function initiatePayment({ amountFCFA, phone }) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/collection/v1_0/requesttopay`;
  const referenceId = uuidv4();

  const body = {
    amount: amountFCFA.toString(),
    currency: "XAF",
    externalId: referenceId,
    payer: { partyIdType: "MSISDN", partyId: phone },
    payerMessage: "Payment for your order",
    payeeNote: "Thank you for shopping with us",
  };

  const resp = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": MOMO_ENVIRONMENT,
      "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
    },
  });

  // 202 Accepted → promptPin on device
  return {
    transactionId: referenceId,
    promptPin: resp.status === 202,
  };
}

module.exports = { initiatePayment };
