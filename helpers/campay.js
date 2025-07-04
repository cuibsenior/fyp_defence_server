require("dotenv").config();

const axios = require("axios");
const { CAMPAY_API_BASE, CAMPAY_USERNAME, CAMPAY_PASSWORD, APP_URL } =
  process.env;

const webhook = process.env.CAMPAY_WEBHOOK_URL || "http://localhost:5000/api";

/* const webhook = "https://fypserver.up.railway.app/api"; */

if (!CAMPAY_API_BASE || !CAMPAY_USERNAME || !CAMPAY_PASSWORD || !APP_URL) {
  throw new Error(
    "Missing CamPay config. Please set CAMPAY_API_BASE, CAMPAY_USERNAME, CAMPAY_PASSWORD and APP_URL in .env"
  );
}

const client = axios.create({
  baseURL: CAMPAY_API_BASE,
  timeout: 15000,
});

// Helper to detect payment option based on phone prefix
function getPaymentOption(phone) {
  if (phone.startsWith("+23769")) return "OM"; // Orange Money
  if (
    phone.startsWith("+23767") ||
    phone.startsWith("+23768") ||
    phone.startsWith("+23765") ||
    phone.startsWith("+23766")
  )
    return "MOMO"; // MTN MoMo
  // Add more prefixes as needed
  return "MOMO";
}

async function requestPayment({
  orderId,
  phone,
  amount,
  firstName,
  lastName,
  email,
}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Token ead858b19b91a16ce79c7e0f0b8512c7f32ea5eb",
  };

  const redirect = process.env.CLIENT_URL || "http://localhost:5173";
  const paymentOption = getPaymentOption(phone);

  // Remove all spaces from phone number
  const newphone = phone.replace(/[^\d+]/g, "");
  const payload = {
    amount: "2",
    currency: "XAF",
    from: newphone,
    description: `Payment for ${orderId}`,
    first_name: firstName,
    last_name: lastName,
    email: email,
    external_reference: `${orderId}`,
    redirect_url: `${redirect}/shop/payment-success?orderId=${orderId}`,
    failure_redirect_url: `${redirect}/shop/payment-failure?orderId=${orderId}`,
    payment_options: paymentOption, // <-- Use correctSGF payment option
    payer_can_pay_more: "no",
    /* callback_url: `https://fypserver.up.railway.app/api/shop/order/campay-webhook`, */ // <-- Add this line
    callback_url: `${webhook}/shop/order/campay-webhook`,
  };

  const response = await client.post(
    "https://demo.campay.net/api/get_payment_link/",
    payload,
    { headers: headers }
  );

  console.log(response.data);

  return response;
}

module.exports = { requestPayment };
