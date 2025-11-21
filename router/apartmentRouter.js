const express = require("express");
const apartmentController = require("../controllers/apartmentController/getAllapartment");

const router = express.Router();

router.get("/", apartmentController.getAllapartment);

module.exports = router;
