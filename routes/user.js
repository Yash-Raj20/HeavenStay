const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');

const upload = multer({ storage });
require("dotenv").config();

router.get("/", (req, res) => {
  res.render("listings", { user: req.user || null });
});

// Signup route
router.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});


// Users Profile Routes
router.get("/profile/:id", (req, res) => {
  res.render("users/profile.ejs", { user: req.user });
});

// Payment Routes
router.get("/payment", (req, res) => {
  const userLoggedIn = req.session.user ? true : false; // Check login
  res.render("users/payment.ejs", { userLoggedIn });
});


// Login route
router.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

// Signup POST route
router.post(
  "/signup",
  wrapAsync(async (req, res, next) => {
    try {
      const { name, username, email, password } = req.body;

      // Initialize other profile fields with default values
      const newUser = new User({
        name,
        username,
        email,
        socialMediaLinks: {
          facebook: "",
          twitter: "",
          instagram: "",
          linkedin: "",
        },
        profilePicture: "",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        },
        bio: "",
      });

      const registeredUser = await User.register(newUser, password);

      req.login(registeredUser, (err) => {
        if (err) return next(err);
        req.flash("success", "Welcome to HeavenStay!");
        res.redirect("/listings");
      });
    } catch (e) {
      req.flash("error", e.message);
      res.redirect("/signup");
    }
  })
);

//Login POST route
router.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res) => {
    req.flash("success", "Welcome back to HeavenStay!");
    let redirect = res.locals.redirectUrl || "/listings";
    res.redirect(redirect);
  }
);

//login route
router.post(
  "/login",
  saveRedirectUrl,  // Save the redirect URL before authentication
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res) => {
    req.flash("success", "Welcome back to HeavenStay!");
    let redirect = res.locals.redirectUrl || "/listings";  // Redirect to saved URL or default
    res.redirect(redirect);
  }
);

// Logout route
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/listings");
      }

      // Log session destruction
      console.log("User session has been destroyed.");

      res.clearCookie("connect.sid"); // Clear the session cookie
      req.flash("success", "You are logged out!");
      res.redirect("/listings");
    });
  });
});

// Forgot Password route
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password.ejs");
});

// Forgot password POST route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "No account with that email exists.");
      return res.redirect("/forgot-password");
    }

    // Generate token and expiration
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset link via email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: true,
      port: 587,
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    // Send reset email
    const resetLink = `http://localhost:8080/reset-password/${resetToken}`;
    const mailOptions = {
      to: user.email,
      from: "ratneshkumarstm987@gmail.com",
      subject: "Password Reset Request",
      html: `
        <p>Hello,</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };
    await transporter.sendMail(mailOptions);

    req.flash("success", "A password reset link has been sent to your email.");
    res.redirect("/forgot-password");
  } catch (error) {
    console.error("Error in forgot-password route:", error);
    req.flash("error", "Something went wrong, please try again.");
    res.redirect("/forgot-password");
  }
});

// Reset Password route
router.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/forgot-password");
    }

    res.render("users/reset-password", { token });
  } catch (error) {
    console.error("Error in reset-password route:", error);
    req.flash("error", "Something went wrong, please try again.");
    res.redirect("/forgot-password");
  }
});

router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/forgot-password");
    }

    // Use Passport's setPassword method for secure hashing
    await user.setPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash("success", "Your password has been successfully updated.");
    res.redirect("/login");
  } catch (error) {
    console.error("Error in reset-password route:", error);
    req.flash("error", "Something went wrong, please try again.");
    res.redirect("/forgot-password");
  }
});

// Edit Profile (PUT route)
router.put(
  "/profile",
  upload.single("profilePicture"),
  wrapAsync(async (req, res) => {
    try {
      const userId = req.user._id; // Ensure `req.user` exists and contains `_id`.

      const { name, bio, socialMediaLinks, address } = req.body;

      let profilePicture = req.user.profilePicture;

      if (req.file) {
        profilePicture = req.file.path; // Assign new picture path if uploaded.
      }

      // Validate and update the user:
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, bio, profilePicture, socialMediaLinks, address },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        req.flash("error", "User not found.");
        return res.redirect("/profile");
      }

      req.flash("success", "Profile updated successfully!");
      res.redirect("/profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      req.flash("error", "Error updating profile.");
      res.redirect("/profile");
    }
  })
);

// Route for get listing owner profile
router.get("/host/:id", async (req, res) => {
  try {
    const owner = await User.findById(req.params.id);
    if (!owner) return res.status(404).send("Host not found");

    const listings = await Listing.find({ owner: owner._id });
    const reviews = await Review.find({ host: owner._id }).populate("user");

    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(2)
      : "N/A";

    res.render("users/host.ejs", { owner, listings, reviews, reviewCount, averageRating });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});




// Route to initiate Google login
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Route to handle the callback from Google
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("/listings"); // Redirect after successful login
  }
);


// Handle form submission
router.post("/send-message", async (req, res) => {
  const { name, email, message } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    req.flash("error", "❌ All fields are required.");
    return res.redirect("/contact");
  }

  try {
    // Nodemailer Transport
    let transporter = nodemailer.createTransport({
      service: "gmail", // Use your email provider (Gmail, Outlook, etc.)
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: email,
      to: process.env.EMAIL_USER, // Your admin email to receive messages
      subject: `New Contact Message from ${name}`,
      text: `You received a new message:\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log("Message received from:", name, email);

    // Success flash message
    req.flash("success", "✅ Message sent successfully!");
    res.redirect("/contact"); // Redirect after successful email sending
  } catch (error) {
    console.error("Error sending email:", error);
    req.flash("error", "❌ Failed to send message. Please try again.");
    res.redirect("/contact"); // Redirect on error
  }
});


module.exports = router;
