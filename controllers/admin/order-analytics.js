// server/controllers/admin/order-analytics.js
const Order = require("../../models/Order");

exports.getSalesAnalytics = async (req, res) => {
  try {
    // Defensive: Only include orders with required fields in your database
    const salesByDate = await Order.aggregate([
      {
        $match: {
          orderDate: { $exists: true, $ne: null },
          totalAmount: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          totalSales: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topProducts = await Order.aggregate([
      { $match: { cartItems: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: "$cartItems" },
      {
        $group: {
          _id: "$cartItems.title",
          quantity: { $sum: "$cartItems.quantity" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);

    const statusCounts = await Order.aggregate([
      {
        $match: { orderStatus: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      salesByDate: salesByDate.map((d) => ({
        date: d._id,
        totalSales: d.totalSales,
      })),
      topProducts: topProducts.map((p) => ({
        title: p._id,
        quantity: p.quantity,
      })),
      statusCounts: statusCounts.map((s) => ({
        status: s._id,
        count: s.count,
      })),
    });
  } catch (e) {
    console.error("Sales analytics error:", e);
    res
      .status(500)
      .json({ success: false, message: "Analytics error", error: e.message });
  }
};
