const express = require("express");
const userController = require("../../controllers/userController/getAlluser");
const userControllerUpdate = require("../../controllers/userController/updateme");
const authController = require("../../controllers/authController/authcontroller");

const router = express.Router();

router
  .route("/")
  .get(
    authController.protect,
    authController.restricTo("Admin"),
    // authController.isLoggedIn,
    userController.getAlluser
  ) // GET ALL USER
  .post(userController.createUser); // CREATE USER.......

router.patch(
  "/updateMe",
  authController.protect,
  authController.uploadUserPhoto,
  authController.resizeUserPhoto,
  userControllerUpdate.updateMe
);

router.delete(
  "/deleteMe",
  authController.protect,
  authController.restricTo("Admin"),
  userController.deleteUser
);
router
  .route("/getuser")
  .get(
    authController.protect,
    authController.restricTo("Admin"),
    userController.getUser
  ); // GET USRE BY ID // DELETE USER BY ID

module.exports = router;
