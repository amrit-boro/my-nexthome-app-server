const catchAsync = require("../../utils/catchAsync");

exports.searchPgs = catchAsync(async (req, res) => {
  const { q } = req.query;
  console.log(q);
  res.status(200).json({
    status: "succes",
  });
});
