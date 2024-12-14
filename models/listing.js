const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  images: [ // Change 'image' to 'images' for multiple images
    {
      url: String,
      filename: String,
    },
  ],
  price: Number,
  location: String,
  country: String,
  category: String,
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
