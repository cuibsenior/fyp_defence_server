const express = require("express");
const {
  createOrder,
  getAllOrdersByUser,
  getOrderDetails,
  capturePayment,
  campayWebhook,
} = require("../../controllers/shop/order-controller");

/* const { getFCFAToUSD } = require("../../../client/src/lib/exchangerate"); */

const router = express.Router();

/* router.get("/exchangerate", async (req, res) => {
  try {
    const rate = await getFCFAToUSD();
    res.json({ rate });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exchange rate" });
  }
}); */

router.post("/create", createOrder);
router.post("/capture", capturePayment);
router.get("/list/:userId", getAllOrdersByUser);
router.get("/details/:orderId", getOrderDetails);
router.get("/campay-webhook", campayWebhook); // Add GET for Campay
router.post("/campay-webhook", campayWebhook); // Keep POST for manual/curl testing

module.exports = router;
