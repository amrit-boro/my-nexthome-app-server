const pgRepo = require("../../service/PG/pgRepo");
const catchAsync = require("../../utils/catchAsync");
const { PgShema } = require("../../service/DdShema/dbShema");
const path = require("path");
const AppError = require("../../utils/appError");
const multer = require("multer");
const sharp = require("sharp");
const { id } = require("zod/v4/locales");
const { date } = require("zod");
const pool = require("../../config/db");

const multerStorage = multer.memoryStorage();

// filter the photo file like JPEG, PNG
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an Image! please upload only images", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

/// UPLOAD MULTIPLE IMAGES----------------------------------------------

exports.uploadPgimages = upload.array("image_url", 50);

// IMAGE RESIZE---------------------------------------------------------
exports.resizePgImages = catchAsync(async (req, res, next) => {
  console.log("files: ", req.files);
  if (!req.files || req.files.length === 0) return next();

  req.body.image_url = [];

  await Promise.all(
    req.files.map(async (file, idx) => {
      const filename = `Pg-${req.user.userId}-${Date.now()}-${idx + 1}.jpeg`;
      const outputPath = path.join(__dirname, "../../public", filename);

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      req.body.image_url.push(filename);
    })
  );

  next();
});

exports.getAllPGroom = catchAsync(async (req, res) => {
  const result = await pgRepo.findAllPGroom();
  const totalPg = result[0].properties.length;
  res.status(200).json({ TotalPg: totalPg, data: result });
});
exports.createPG = catchAsync(async (req, res, next) => {
  const id = req.user.userId;

  // 1. Read directly from req.body (since we removed the wrapper on frontend)
  let rawData = { ...req.body };

  // 2. Handle Amenities (FormData edge case: single string vs array)
  if (rawData.amenities) {
    if (!Array.isArray(rawData.amenities)) {
      rawData.amenities = [rawData.amenities];
    }
  } else {
    rawData.amenities = [];
  }

  // 3. Inject Images (from the resize middleware)
  if (req.body.image_url) {
    rawData.image_url = req.body.image_url;
  }

  // 4. Validate with Zod
  const parsed = PgShema.safeParse(rawData);

  if (!parsed.success) {
    console.error("Zod Validation Failed:", parsed.error.format());
    return next(new AppError("Validation failed", 400));
  }

  console.log(parsed.data);

  // 5. Create
  const result = await pgRepo.pgCreate(id, parsed.data);

  res.status(200).json({
    status: "success",
    data: result,
  });
});
// exports.createPG = catchAsync(async (req, res, next) => {
//   // 1. Extract the data (assuming everything is inside req.body.formData)
//   const rawData = req.body.formData;
//   console.log("data: ", rawData);
//   const amenitiesObj = rawData.amenities || {}; // Fallback to empty object if undefined

//   // 2. Transform { "wifi": true } -> ["wifi"]
//   const amenitiesArray = Object.keys(amenitiesObj).filter((key) => {
//     return amenitiesObj[key] === true;
//   });

//   console.log("Transformed amenities:", amenitiesArray);

//   // 3. Prepare data for validation
//   // We create a new object spreading the original data, but overwriting 'amenities'
//   // with our new array.
//   const dataToValidate = {
//     ...rawData,
//     amenities: amenitiesArray,
//   };

//   console.log("data to validate: ", dataToValidate);

//   // 4. Schema Validation
//   // We validate the CLEAN data, not the raw req.body
//   const parsed = PgShema.safeParse(dataToValidate);

//   // if (!parsed.success) {
//   //   // It is good practice to log the Zod error to see why it failed
//   //   console.error(parsed.error);
//   //   return next(new AppError("Validation failed", 400));
//   // }

//   // const fields = parsed.data;

//   // // 5. Create in DB
//   // const result = await pgRepo.pgCreate(id, fields); // Passed 'fields' directly

//   // res.status(200).json({
//   //   status: "succes",
//   //   data: result,
//   // });
// });

exports.getPg = catchAsync(async (req, res) => {
  const id = req.user.userId;
  const pg = await pgRepo.findPgById(id);
  res.status(200).json({
    status: "succes",
    pg,
  });
});

// DELETE PG--------------------------------------------------------------------------
exports.deletePg = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await pgRepo.findByIdAndDelete(id);
  res.status(201).json({
    status: "succes",
    data: {
      result,
    },
  });
});

exports.updatePg = catchAsync(async (req, res, next) => {
  const updateFields = { ...req.body };
  if (req.body.password) {
    return next(new AppError("This route is not for passwrod update", 400));
  }
  if (updateFields.originalname && updateFields.originalname.length > 0) {
    updateFields.image_url = req.body.originalname; // Use the array of filenames
  }
  // const propertyId = await pgRepo.findPgById(req.user.userId);
  // const id = propertyId[0].propertyId; // Property Id...................................

  const user = await pgRepo.findByIdAndUpdate(id, updateFields);

  if (!user) {
    return next(new AppError("User not found with that ID", 404));
  }
  res.status(200).json({
    status: "succes",
    data: user,
  });
});

exports.deletePgPhoto = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const { id: photoId } = req.params.id;

  const Property_result = await pgRepo.findPgById(userId);
  const propertyId = Property_result[0].propertyId;

  const result = await pgRepo.deletePgPhoto(propertyId, photoId);
  res.status(200).json({
    status: "succes",
    data: {
      result,
    },
  });
});

exports.uploadPgphoto = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;
  const Property_result = await pgRepo.findPgById(userId);
  const propertyId = Property_result[0].propertyId; // Property Id..............
  const imageFilenames = req.body.image_url;

  console.log("imageFilenames: ", imageFilenames);

  const result = await pgRepo.uploadPhotos(propertyId, imageFilenames);

  res.status(200).json({
    status: "success",
    data: {
      result,
    },
  });
});

//UPDATE PG DETAILS---------------------------------------------------------------------

exports.updatePgdetails = catchAsync(async (req, res, next) => {
  const userid = req.user.userId;
  const updateFields = req.body;
  const result = await pgRepo.upDatepgdetils(userid, updateFields);
  res.status(200).json({
    status: "succes",
    data: {
      result,
    },
  });
});

exports.getPgById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await pgRepo.getPgdetailById(id);
  res.status(200).json({
    status: "success",
    data: {
      result,
    },
  });
});
