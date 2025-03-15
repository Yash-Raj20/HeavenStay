const express = require("express");
const router = express.Router();

// Define routes
router.get("/terms", (req, res) => res.render("pages/terms"));
router.get("/privacy", (req, res) => res.render("pages/privacy"));
router.get("/faq", (req, res) => res.render("pages/faq"));
router.get("/contact", (req, res) => {
    res.render("pages/contact", {
      messages: req.flash(),
    });
  });  
router.get("/about", (req, res) => res.render("pages/about"));

module.exports = router; // Export the router
