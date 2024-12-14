const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  googleId: String, // For storing Google OAuth ID
  profilePicture: {
    url: String, // URL for profile picture (can store Google photo)
    filename: String, // Optional if uploading files locally
  },
  resetPasswordToken: String, // Token for password reset
  resetPasswordExpires: Date, // Expiration date for reset token
  bio: String, // User's bio or description
  socialMediaLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the creation date
  },
});

// Add Passport.js plugin for username and password management
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
