// resetOrderId.js
const mongoose = require("mongoose");
const Counter = require("../models/Counter");

mongoose
  .connect(
    "mongodb+srv://francisafoudo:ugodbconnection@cluster0.us3twen.mongodb.net/"
  )
  .then(async () => {
    await Counter.findOneAndUpdate(
      { name: "orderId" },
      { $set: { seq: 0 } },
      { upsert: true }
    );
    console.log("orderId counter reset to 0");
    process.exit();
  });
