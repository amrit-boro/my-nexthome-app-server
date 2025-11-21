const express = require("express");
const rentController = require("../controllers/rentController/getAllrent");
const router = express.Router();

router.get("/", rentController.getAllrent);

module.exports = router;
