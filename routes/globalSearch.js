const express = require("express");
const router = express.Router();
const Listing = require("../models/listing"); // Replace with your models
const User = require("../models/user"); // Replace with your models

router.get("/", async (req, res) => {
  const { q } = req.query;
  console.log("Received query:", q);

  if (!q || q.trim().length < 3) {
    console.log("Query too short:", q);
    return res.status(400).json({ error: "Search query too short. Must be at least 3 characters long." });
  }

  try {
    const listings = await Listing.find({ title: new RegExp(q, "i") });
    const users = await User.find({ username: new RegExp(q, "i") });

    console.log("Listings matched:", listings);
    console.log("Users matched:", users);

    const results = [
      ...listings.map((item) => ({ type: "listing", name: item.title, url: `/listings/${item._id}` })),
      ...users.map((item) => ({ type: "user", name: item.username, url: `/users/${item._id}` })),
    ];

    res.json({ results });
  } catch (err) {
    console.error("Error during global search:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
