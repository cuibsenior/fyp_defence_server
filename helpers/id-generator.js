const Counter = require("../models/Counter");

async function getNextOrderId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "orderId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `orderId-${String(counter.seq).padStart(5, "0")}`;
}

async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "userId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `user-${counter.seq}`;
}

module.exports = { getNextOrderId, getNextUserId };
