const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/ErrorController/errorController");
const pgrouter = require("./router/pgRouter/pgRouter");
const aiRouter = require("./router/aiRouter/airouter");
const pgSearch = require("./router/pgRouter/pgSearchRoter");
const rentrouter = require("./router/rentRouter");
const apartmentrouter = require("./router/apartmentRouter");
const localrouter = require("./router/localRouter");
const userRouter = require("./router/userRouter/userRouter");
const userLogin = require("./router/authentication/userlogin");
const userSignup = require("./router/authentication/signup");
const path = require("path");
const app = express();
const cookieParser = require("cookie-parser");

// Middleware...
// Middleware to parse JSON data
app.use(cookieParser());

// allow only your frontend origin and enable credentials

app.use(
  cors({
    origin: "http://localhost:5173", // change to your React origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "../server/public")));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// USER related router...............
app.use("/api/v1", userLogin);
app.use("/api/v1", userSignup);

app.use("/api/v1/user", userRouter);

// PG  related router...............
app.use("/api/v1/pg", pgrouter);
app.use("/api/v1/pgs/search", pgSearch);

app.use("/api/v1/rent", rentrouter);
app.use("/api/v1/apartment", apartmentrouter);
app.use("/api/v1/localHouse", localrouter);

// AI-INTEGREATION------------------------------------------------------------------------------
app.use("/api/v1/ai", aiRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
