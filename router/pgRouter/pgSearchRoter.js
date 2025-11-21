const express = require("express");
const pgController = require("../../controllers/pgController/pgSearchController");
const router = express.Router();

router.get("/", pgController.searchPgs);

module.exports = router;
