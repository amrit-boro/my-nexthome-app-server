const UserRepo = require("../../service/User/userRepo");
const AppError = require("../../utils/appError");
const sharp = require("sharp");
const catchAsync = require("../../utils/catchAsync");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const multer = require("multer");

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "../../public");
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split("/")[1];
//     cb(null, `user-${req.user.userId}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage();

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

exports.uploadUserPhoto = upload.single("profile_photo_url");
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.userId}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`../../public/${req.file.filename}`);

  next();
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  console.log("token: ", token);

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );
  }

  // 2) Verify token-------------------------------------------------------------
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const freshUser = await UserRepo.findById(decoded.userId);
  if (!freshUser) {
    return next(
      new AppError("The user belonging to this token does no longer exist")
    );
  }

  req.user = freshUser;
  next();
});

// CONDITIONAL RENDERING---------------------------------
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  // 1) Check if cookie exists
  if (!req.cookies.jwt) return next();

  try {
    // 2) Verify token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );

    // 3) Check if user still exists
    const freshUser = await UserRepo.findById(decoded.userId);
    if (!freshUser) return next();

    // 4) Put user into req (or res.locals)
    req.user = freshUser;
    res.locals.user = freshUser;

    return next(); // stop here (IMPORTANT)
  } catch (err) {
    return next(); // if verification fails, also continue
  }
});

exports.restricTo = (roles) => {
  return (req, res, next) => {
    if (roles != req.user.roleName) {
      return next(
        new AppError("You don't have permisstion to perfrom this action", 403)
      );
    }
    next();
  };
};
