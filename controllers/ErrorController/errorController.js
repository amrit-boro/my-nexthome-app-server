const { stack } = require("../../app");
const AppError = require("../../utils/appError");

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendPordError = (err, res) => {
  // Operational error.................Send to the client !!!
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unkown error : don't leak error details... to the client
  } else {
    console.log(err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong",
    });
  }
};

const handleInvalid = (err) => {
  const errorMessage = err.message;
  const matchError = errorMessage.match(/"([^"]+)"/);

  const value = matchError ? `Invalid _id: ${matchError[1]}` : null;
  return new AppError(value, 400);
};

const handleDuplicate = (err) => {
  const message = err.detail;
  const matchError = message.match(/\(([^)]+)\)=\(([^)]+)\)/);
  console.log("matchError: ", matchError);
  const value = matchError
    ? ` ${matchError[1]}: ${matchError[2]} already exists`
    : null;

  return new AppError(value, 400);
};

const handleJWTError = (err) => {
  return new AppError("Invalid token! Please log in again", 401); // 401 unauthorized...
};

const handleJWTExpire = (err) =>
  new AppError("Your token has expired! please login again", 401);

// ERROR HANDLING.................................................

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendDevError(err, res);
  } else if (process.env.NODE_ENV === "production") {
    console.log(err.code);
    if (err.code === "22P02") err = handleInvalid(err);
    if (err.code === "23505") err = handleDuplicate(err);
    if (err.name === "JsonWebTokenError") err = handleJWTError(err);
    if (err.name === "TokenExpiredError") err = handleJWTExpire(err);
    sendPordError(err, res);
  }
};
