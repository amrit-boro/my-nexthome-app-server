const pgController = require("../../controllers/pgController/getAllPGroom");
const authController = require("../../controllers/authController/authcontroller");
// const multer = require("multer");
const express = require("express");
const router = express.Router();

// const upload = multer({ dest: "../public" });

// router.post("/photo", upload.single("photo"), pgController.photo);

router.get("/getAllpg", pgController.getAllPGroom);

// Protect-----------------
router.use(authController.protect, authController.restricTo("Admin"));

router.get("/getSinglePg", pgController.getPg);
router.get("/getSinglePg/:id", pgController.getPgById);

// pg photo upload--------------------------
router.post(
  "/uploadPgphoto",
  pgController.uploadPgimages,
  pgController.resizePgImages,
  pgController.uploadPgphoto
);
router.post(
  "/pgCreate",
  pgController.uploadPgimages,
  pgController.resizePgImages,
  pgController.createPG
);
router.delete("/deletePg", pgController.deletePg);
router.delete("/deletePgPhoto/:id", pgController.deletePgPhoto);
router.patch(
  "/updatePg",
  pgController.uploadPgimages,
  pgController.resizePgImages,
  pgController.updatePg
);

router.patch("/updatePgDetails", pgController.updatePgdetails);

module.exports = router;
