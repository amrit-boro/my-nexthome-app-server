const jwt = require("jsonwebtoken");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
exports.createSendToken = (user, statusCode, res) => {
  const token = signToken(user.userId);
  // const cookieOptions = {
  //   expiresIn: new Date(
  //     Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  //   ),
  //   httpOnly: true,
  // };

  // if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  // res.cookie("jwt", token, cookieOptions);

  // **CRITICAL FIX: Remove password from the output**
  user.password = undefined;

  return res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};
