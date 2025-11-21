const UserRepo = require("../../service/User/userRepo");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");

exports.getAlluser = catchAsync(async (req, res) => {
  const result = await UserRepo.findAllUsers();
  res.status(200).json({ Total: result.length, data: result });
});

// CREATE USER.........................

exports.createUser = catchAsync(async (req, res) => {
  const fields = req.body;

  const user = await UserRepo.userCreate(fields);
  res.status(200).json({
    message: "success",
    data: user,
  });
});

// GET USER BY ID......................

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await UserRepo.findById(req.user.userId);

  if (!user) {
    console.log(id);
    return next(new AppError("User not found with that ID", 404));
  }
  res.status(200).json({
    message: "success",
    data: user,
  });
});

// UPDATE USER BY ID..............

// DELETE USER BY ID .......................

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await UserRepo.findByIdAndDelete(req.user.userId);
  if (!user) {
    return next(new AppError("User not found with that ID", 404));
  }
  res.status(204).json({
    status: "success",
    message: "User soft-deleted successfully",
    data: null,
  });
});
