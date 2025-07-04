const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  userName: {
    type: String,
  }, // Will be set as firstName + " " + lastName
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "user",
  },
});

// Always set userName before saving
UserSchema.pre("save", function (next) {
  this.userName = `${this.firstName} ${this.lastName}`;
  next();
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
