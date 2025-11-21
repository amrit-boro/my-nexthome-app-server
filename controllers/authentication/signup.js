const UserRepo = require("../../service/User/userRepo");
const catchAsync = require("../../utils/catchAsync");
const generateToken = require("../../utils/generateToken");

exports.signup = catchAsync(async (req, res) => {
  console.log(req.body);
  const fields = req.body;
  const result = await UserRepo.userCreate(fields);

  const token = generateToken.createSendToken({ userId: result.userId });
  const cookieOptions = {
    httpOnly: true, // cannot be accessed by JS
    secure: process.env.NODE_ENV === "production", // true in production
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
  };
  // Cookie creation----------------------------------
  res.cookie("jwt", token, cookieOptions);

  res.status(200).json({
    status: "succes",
    token,
    data: {
      result,
    },
  });
});
