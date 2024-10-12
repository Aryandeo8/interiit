import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = process.env.PORT;
env.config();
app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
db.connect();

app.get("/", (req, res) => {
  res.render("index.ejs");
});
app.get("/option", (req, res) => {
    if (req.isAuthenticated()) {
      res.render("option.ejs");
    } else {
      res.redirect("/");
    }
});
app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile","email"],
    })
);

app.get(
    "/auth/google/option",
    passport.authenticate("google", {
      successRedirect: "/option",
      failureRedirect: "/",
    })
);
app.get("/portal", (req, res) => {
    res.render("portal.ejs");
});
passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://interiit-cwy6.onrender.com/auth/google/option",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          console.log(profile);
          const result = await db.query("SELECT * FROM users WHERE email = $1", [
            profile.email,
          ]);
          if (result.rows.length === 0) {
            const newUser = await db.query(
              "INSERT INTO users (email, password) VALUES ($1, $2)",
              [profile.email, "google"]
            );
            return cb(null, newUser.rows[0]);
          } else {
            return cb(null, result.rows[0]);
          }
        } catch (err) {
          return cb(err);
        }
      }
    )
);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
passport.deserializeUser((user, cb) => {
    cb(null, user);
});
passport.serializeUser((user, cb) => {
    cb(null, user);
});