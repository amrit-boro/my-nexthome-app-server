const express = require("express");
const loginController = require("../../controllers/authentication/login");
const autthController = require("../../controllers/authController/authcontroller");

const router = express.Router();

router.use(autthController.isLoggedIn);
router.post("/login", loginController.userlogin);

module.exports = router;
