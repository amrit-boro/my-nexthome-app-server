const UserRepo = require("../../service/User/userRepo");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");

exports.userlogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) Check if email and password exist-------------------------------------
  if (!email || !password) {
    return next(new AppError("Please provide email or password", 400));
  }
  // 2) Check if user exists && password is correct----------------------------
  const user = await UserRepo.findUser({ email, password });
  // 3) If everything ok, send token to client--------------------------------
  const cookieOptions = {
    httpOnly: true, // cannot be accessed by JS
    secure: process.env.NODE_ENV === "production", // true in production
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
  };
  // COOKIE creation---------------------------------------------;
  res.cookie("jwt", user.token, cookieOptions);

  res.status(200).json({
    status: "succes",
    isLoggedIn: true,
    data: user,
  });
});
