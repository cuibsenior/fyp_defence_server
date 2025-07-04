require("dotenv").config();
const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const { getNextOrderId } = require("../../helpers/id-generator");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const { requestPayment } = require("../../helpers/campay");
const User = require("../../models/User");

const redirect = process.env.CLIENT_URL || "http://localhost:5173";

// 1. Create Order: Save as pending, then initiate payment
const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartItems,
      addressInfo,
      paymentMethod,
      totalAmount,
      cartId,
    } = req.body;

    // Fetch user info from DB
    const user = await User.findOne({ userId: req.body.userId }); // Find by userId, not _id
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Generate sequential orderId
    const orderId = await getNextOrderId();

    // Save order as pending
    const newOrder = new Order({
      orderId,
      userId,
      cartId,
      cartItems,
      addressInfo,
      orderStatus: "pending",
      paymentMethod,
      paymentStatus: "pending",
      totalAmount,
      orderDate: new Date(),
      orderUpdateDate: new Date(),
    });
    await newOrder.save();

    // Payment logic
    let method = paymentMethod;
    if (
      paymentMethod === "mobileMoney" &&
      addressInfo.phone?.startsWith("+23769")
    ) {
      method = "orangeMoney";
    }

    if (method === "mobileMoney" || method === "orangeMoney") {
      const result = await requestPayment({
        orderId,
        phone: addressInfo.phone,
        amount: totalAmount,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });

      return res.status(200).json({ success: true, ...result.data, orderId });
    }

    // PayPal logic
    const create_payment_json = {
      intent: "sale",
      payer: { payment_method: "paypal" },
      redirect_urls: {
        return_url: `${redirect}/shop/payment-success?orderId=${orderId}`,
        cancel_url: `${redirect}/shop/payment-failure?orderId=${orderId}`,
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: "Order Payment",
                sku: orderId,
                price: totalAmount.toFixed(2),
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: totalAmount.toFixed(2),
          },
          description: `Payment for ${orderId}`,
        },
      ],
    };

    paypal.payment.create(create_payment_json, (error, paymentInfo) => {
      if (error) {
        console.error("PayPal error:", error.response ? error.response : error);
        return res.status(500).json({
          success: false,
          message: error.response
            ? error.response.message
            : error.message || "Error while creating paypal payment",
          details: error.response || error,
        });
      } else {
        const approvalURL = paymentInfo.links.find(
          (link) => link.rel === "approval_url"
        ).href;
        res.status(201).json({
          success: true,
          approvalURL,
          orderId,
          cartId,
        });
      }
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || "Unknown server error",
    });
  }
};

// 2. Capture Payment: Update order after payment is successful
const capturePayment = async (req, res) => {
  try {
    const {
      paymentId,
      payerId,
      orderId,
      userId,
      cartItems,
      addressInfo,
      paymentMethod,
      totalAmount,
      cartId,
    } = req.body;

    // Find and update the pending order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.orderStatus = "confirmed";
    order.paymentStatus = "paid";
    order.paymentId = paymentId;
    order.payerId = payerId;
    order.orderUpdateDate = new Date();
    await order.save();

    // Update product stock
    for (let item of cartItems) {
      let product = await Product.findById(item.productId);
      if (product) {
        product.totalStock -= item.quantity;
        await product.save();
      }
    }

    // Delete cart
    await Cart.findByIdAndDelete(cartId);

    res.status(200).json({
      success: true,
      message: "Order confirmed",
      data: order,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

// 3. Get all orders for a user
const getAllOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId });
    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No orders found!",
      });
    }
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

// 4. Get order details by orderId (NOT _id)
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

// 5. Get all orders (for admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 });
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

// Campay webhook handler
const campayWebhook = async (req, res) => {
  /*Accept both GET (Campay) and POST (manual/curl) for Testing your webhook handler code.
    Debugging your backend without making a real payment.*/
  const data = Object.keys(req.query).length ? req.query : req.body;

  try {
    const { external_reference, status } = data;
    if (!external_reference) {
      return res
        .status(400)
        .json({ success: false, message: "No order reference" });
    }

    const order = await Order.findOne({ orderId: external_reference });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (status === "SUCCESSFUL") {
      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
    } else if (status === "FAILED") {
      order.paymentStatus = "failed";
      order.orderStatus = "cancelled";
    }
    order.orderUpdateDate = new Date();
    await order.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Webhook error" });
  }
};

module.exports = {
  createOrder,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
  getAllOrders,
  campayWebhook,
};
