require("dotenv").config();
const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const { requestPayment } = require("../../helpers/campay");
const { initiatePayment: orangePay } = require("../../helpers/orangemoney");

const { CLIENT_URL } = process.env;
const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus,
      totalAmount,
      orderDate,
      orderUpdateDate,
      paymentId,
      payerId,
      cartId,
    } = req.body;

    let method = paymentMethod;
    if (
      paymentMethod === "mobileMoney" &&
      addressInfo.phone?.startsWith("+23769")
    ) {
      method = "orangeMoney";
    }

    /* const { getFCFAToUSD } = require("../../helpers/exchangeRate");
    const rate = await getFCFAToUSD(); */

    /* if (paymentMethod === "mobileMoney") {
      const result = await require("../../helpers/mobileMoney").initiatePayment(
        {
          amountFCFA: totalAmount,
          phone: req.body.addressInfo.phone,
        }
      );
      return res.json({ success: true, paymentMethod, ...result });
    } */

    if (method === "mobileMoney") {
      const result = await require("../../helpers/campay").requestPayment({
        amountFCFA: totalAmount,
        phone: addressInfo.phone,
      });
      return res.status(200).json({ success: true, ...result });
    }

    if (method === "orangeMoney") {
      const result = await require("../../helpers/campay").requestPayment({
        amountFCFA: totalAmount,
        phone: addressInfo.phone,
      });
      return res.status(200).json({ success: true, ...result });
    }

    /* if (paymentMethod === "orangeMoney") {
      const result = await require("../../helpers/orangeMoney").initiatePayment(
        {
          amountFCFA: totalAmount,
          phone: req.body.addressInfo.phone,
        }
      );
      return res.json({ success: true, paymentMethod, ...result });
    } */

    const create_payment_json = {
      // PayPal path: convert FCFA to USD
      /* const usdAmount = (totalAmount / rate).toFixed(2); */
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "${CLIENT_URL}/shop/paypal-return",
        cancel_url: "${CLIENT_URL}/shop/paypal-cancel",
      },
      transactions: [
        {
          item_list: {
            items: cartItems.map((item) => ({
              name: item.title,
              sku: item.productId,
              price: item.price.toFixed(2),
              currency: "USD",
              quantity: item.quantity,
            })),
          },
          amount: {
            currency: "USD",
            total: totalAmount.toFixed(2),
          },
          description: "description",
        },
      ],
    };

    paypal.payment.create(create_payment_json, async (error, paymentInfo) => {
      if (error) {
        console.log(error);

        return res.status(500).json({
          success: false,
          message: "Error while creating paypal payment",
        });
      } else {
        const newlyCreatedOrder = new Order({
          userId,
          cartId,
          cartItems,
          addressInfo,
          orderStatus,
          paymentMethod,
          paymentStatus,
          totalAmount,
          orderDate,
          orderUpdateDate,
          paymentId,
          payerId,
        });

        await newlyCreatedOrder.save();

        const approvalURL = paymentInfo.links.find(
          (link) => link.rel === "approval_url"
        ).href;

        res.status(201).json({
          success: true,
          approvalURL,
          orderId: newlyCreatedOrder._id,
        });
      }
    });
  } catch (e) {
    console.error("createOrder error:", e);
    // in dev, return the actual message + stack
    return res.status(500).json({
      success: false,
      message: e.message || "Unknown server error",
      ...(process.env.NODE_ENV === "development" && { stack: e.stack }),
    });
  }
};

const makeMomoRequest = async (req, res) => {
  try {
    const { userId, totalAmount, addressInfo, phone } = req.body;

    const result = await requestPayment({
      amountFCFA: totalAmount,
      phone: addressInfo.phone,
    });

    console.log(result.data);

    return res.status(200).json({ success: true, ...result.data });
  } catch (e) {
    console.error("createOrder error:", e);
    // in dev, return the actual message + stack
    return res.status(500).json({
      success: false,
      message: e.message || "Unknown server error",
      ...(process.env.NODE_ENV === "development" && { stack: e.stack }),
    });
  }
};

const capturePayment = async (req, res) => {
  try {
    const { paymentId, payerId, orderId } = req.body;

    let order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order can not be found",
      });
    }

    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paymentId = paymentId;
    order.payerId = payerId;

    for (let item of order.cartItems) {
      let product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Not enough stock for this product ${product.title}`,
        });
      }

      product.totalStock -= item.quantity;

      await product.save();
    }

    const getCartId = order.cartId;
    await Cart.findByIdAndDelete(getCartId);

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order confirmed",
      data: order,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

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

const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

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
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

module.exports = {
  createOrder,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
  makeMomoRequest,
};
