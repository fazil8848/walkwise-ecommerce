require("dotenv/config");
const mongoose = require("mongoose");
const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const nocache = require("nocache");

const userRoute = require("./routes/userRoutes");
const adminRoute = require("./routes/admin");

mongoose
  .connect(process.env.DATABASE)
  .then(() => {
    console.log("Database Is Connected");
  })
  .catch((err) => {
    console.log("Database Connection Failed");
  });

mongoose.set("strictQuery", false);

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 6000000,
    },
  })
);

app.use(nocache());

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.use("/", userRoute);
app.use("/admin", adminRoute);

app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use((req, res, next) => {
  res.status(404).render("404");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("500");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
