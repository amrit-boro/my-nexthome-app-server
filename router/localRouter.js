const express = require("express");
const localController = require("../controllers/localController/getAllLocalRoom");

const router = express.Router();

router.get("/", localController.getAllLocalRoom);

module.exports = router;
