const express = require("express");
const signupController = require("../../controllers/authentication/signup");
const router = express.Router();

console.log("helo");
router.post("/signup", signupController.signup);

module.exports = router;
