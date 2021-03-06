const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Booking = require("../models/booking");
const Review = require("../models/review");
const User = require("../models/user");

// HELPER FUNCTIONS
const {
  isLoggedIn,
  isNotLoggedIn,
  validationLoggin,
} = require("../helpers/middlewares");

//Ruta GET de reviews (currentUser === ownerService) PROFILE 3
router.get("/reviews/:userID", isLoggedIn(), (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userID)) {
    res.status(400).json({ message: "Specified id is not valid" });
    return;
  }
  if (req.session.currentUser._id !== req.params.userID) {
    res.status(400).json({
      message: "You are not allowed to check these review.",
    });
    return;
  }
  Review.find({ user: req.params.userID })
    .populate("booking")
    .populate("author")
    .populate("user")
    .populate("service")
    .then((reviewsOfOwnerService) => {
      res.json(reviewsOfOwnerService);
    })
    .catch((err) => {
      res.json(err);
    });
});

//Ruta por POST para crear una review a un owner
router.post("/reviews/:bookingID", isLoggedIn(), (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.bookingID)) {
    res.status(400).json({ message: "Specified id is not valid" });
    return;
  }
  Booking.findById(req.params.bookingID)
    .then((currentBooking) => {
      if (!currentBooking.clientBooking.equals(req.session.currentUser._id)) {
        res.status(400).json({
          message:
            "You are not allowed to write a review in this booking due to you are not a client.",
        });
        return;
      }
      if (currentBooking.status === "accepted") {
        Review.create({
          booking: req.params.bookingID,
          author: currentBooking.clientBooking,
          user: currentBooking.ownerService,
          service: req.body.service,
          description: req.body.description,
          rating: req.body.rating,
        })
          .then((newReview) => {
            User.findByIdAndUpdate(currentBooking.ownerService, {
              $push: { review: newReview._id },
            })
              .then(() => {
                Booking.findByIdAndUpdate(
                  req.params.bookingID,
                  { review: newReview._id },
                  { new: true }
                ).then(() => {
                  res.json(newReview);
                });
              })
              .catch((err) => {
                res.json(err);
              });
          })
          .catch((err) => {
            res.json(err);
          });
      } else {
        res.status(400).json({
          message:
            "You cannot write a review until your booking will be accepted.",
        });
      }
    })
    .catch((err) => {
      res.json(err);
    });
});

module.exports = router;
