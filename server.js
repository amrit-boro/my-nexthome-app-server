require("dotenv").config();
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION *** Shutting down");
  console.log(err.name, err.message);

  process.exit(1);
});
const app = require("./app");

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION ******  Shutting down");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
