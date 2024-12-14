const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const { isLoggedIn } = require("../middleware.js");

const multer = require("multer");
const { storage } = require("../cloudConfig.js");

const upload = multer({ storage });

const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// Index Route
router.get(
  "/",
  wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  })
);

// New Route
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});

// Create Route (Updated for multiple images)
router.post(
  "/",
  isLoggedIn,
  upload.array("listing[images]", 5), // Accept up to 5 images
  validateListing,
  async (req, res, next) => {
    try {
      const imageDetails = req.files.map(file => ({
        url: file.path,
        filename: file.filename
      }));

      const newListing = new Listing(req.body.listing);
      newListing.owner = req.user._id;
      newListing.images = imageDetails; // Store the array of images
      await newListing.save();
      req.flash("success", "New Listing Created");
      res.redirect("/listings");
    } catch (e) {
      console.error("Error:", e);
      next(e); // Forward the error to the error-handling middleware
    }
  }
);

// Show Route
// Show Route
router.get(
  "/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: {
          path: "author",
        },
      })
      .populate("owner");

    if (!listing) {
      req.flash("error", "Listing you requested for does not exist");
      return res.redirect("/listings");
    }

    // Calculate the number of reviews
    const reviewCount = listing.reviews.length;

    let averageRating = 0;
    if (reviewCount > 0) {
      const totalRating = listing.reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = (totalRating / reviewCount).toFixed(1); // Rounded to 1 decimal place
    }

    // Pass reviewCount and listing data to the template
    res.render("listings/show.ejs", { listing, reviewCount, averageRating });
  })
);


// Update Route (Updated for multiple images)
router.put(
  "/:id",
  isLoggedIn,
  upload.array("listing[images]", 5), // Accept up to 5 images
  validateListing,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (req.files && req.files.length > 0) {
      const imageDetails = req.files.map(file => ({
        url: file.path,
        filename: file.filename
      }));
      listing.images = imageDetails; // Update the array of images
      await listing.save();
    }

    req.flash("success", "Listing Updated");
    res.redirect(`/listings/${id}`);
  })
);

// Delete Route
router.delete(
  "/:id",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deleteList = await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted");
    res.redirect("/listings");
  })
);

// Edit Route
router.get(
  "/:id/edit",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing you requested for does not exist");
      return res.redirect("/listings");
    }

    res.render("listings/edit.ejs", { listing });
  })
);


module.exports = router;
