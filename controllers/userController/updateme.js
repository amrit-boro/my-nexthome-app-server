const UserRepo = require("../../service/User/userRepo");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");

exports.updateMe = catchAsync(async (req, res, next) => {
  const photoFile = req.file;
  console.log("Photo: ", photoFile);

  const updateFields = req.body;
  if (req.body.password) {
    return next(new AppError("This route is not for password update", 400));
  }

  // PHOTOS--------------------------------------------------------------------------
  if (req.file) updateFields.profile_picture_url = req.file.filename;

  const user = await UserRepo.findByIdAndUpdate(req.user.userId, updateFields);
  if (!user) {
    return next(new AppError("User not found with that ID", 404));
  }
  res.status(200).json({
    status: "succes",
  });
});
