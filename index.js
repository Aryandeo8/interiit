import express from "express";
import bodyParser from "body-parser";
import { MongoClient, ObjectId } from "mongodb";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
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

let db; // Declare the `db` variable globally

// Connect to MongoDB
MongoClient.connect(process.env.MONGO_URI, { useUnifiedTopology: true })
  .then((client) => {
    db = client.db(process.env.MONGO_DB_NAME); // Initialize `db`
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    console.error("Error Details:", err);
  });

// Routes
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
    scope: ["profile", "email"],
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

// Google OAuth2 Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/option",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);

        // Check if user exists in MongoDB
        const userCollection = db.collection("users");
        const existingUser = await userCollection.findOne({ email: profile.email });

        if (!existingUser) {
          // Insert new user
          const newUser = {
            email: profile.email,
            password: "google", // Placeholder password for Google-authenticated users
          };
          await userCollection.insertOne(newUser);
          return cb(null, newUser);
        } else {
          return cb(null, existingUser);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

// Passport Serialize/Deserialize
passport.serializeUser((user, cb) => {
  cb(null, user._id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    cb(null, user);
  } catch (err) {
    cb(err);
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
