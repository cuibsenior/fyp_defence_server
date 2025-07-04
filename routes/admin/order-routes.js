const express = require("express");
const {
  getSalesAnalytics,
} = require("../../controllers/admin/order-analytics");
const {
  getAllOrdersOfAllUsers,
  getOrderDetailsForAdmin,
  updateOrderStatus,
} = require("../../controllers/admin/order-controller");

const router = express.Router();

router.get("/get", getAllOrdersOfAllUsers);
router.get("/details/:orderId", getOrderDetailsForAdmin);
router.put("/update/:orderId", updateOrderStatus);
router.get("/analytics", getSalesAnalytics);

module.exports = router;
