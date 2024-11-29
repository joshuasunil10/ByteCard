const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { Client } = require("pg");
const session = require("express-session");

const app = express();
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");

// Session middleware
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, 
  })
);

// Database client setup
const client = new Client({
  user: "cian",
  host: "localhost",
  database: "postgres",
  password: "1234",
  port: 54321,
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err) => console.error("Connection error", err.stack));

// Middleware to check session (require login)
const requireLogin = (req, res, next) => {
  console.log("Checking session in requireLogin:", req.session.user); // Log session user
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

// Routes
app.get("/", (req, res) => {
  console.log("Home route accessed. Current session:", req.session.user); // Log session user
  res.render("home", { user: req.session.user });
});

app.get("/dashboard", requireLogin, (req, res) => {
  console.log("Dashboard accessed. Current session:", req.session.user); 
  res.render("dashboard", { user: req.session.user }); 
});

app.get("/login", (req, res) => {
  console.log("Login page accessed. Current session:", req.session.user); 
  res.render("login");
});




app.get("/register", (req, res) => {
  console.log("Register page accessed. Current session:", req.session.user); 
  res.render("register");
});

app.get("/search", (req, res) => {
  console.log("Search page accessed. Current session:", req.session.user); 
  res.render("search");
});

app.get("/forgot-password", (req, res) => {
  res.render("forgot-password"); 
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Query the database to see if the email exists
    const result = await client.query('SELECT * FROM "ByteCard".users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).send("Email not found");
    }

    // Email exists, render password change form
    res.render("reset-password", { email: email }); // Pass email to the next form
  } catch (error) {
    console.error("Error checking email:", error);
    res.status(500).send("Server error");
  }
});


app.post("/reset-password", async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  // Log the received values to debug
  console.log("Received password:", newPassword);
  console.log("Confirm password:", confirmPassword);

  // Check if the new password matches the confirmation
  if (newPassword !== confirmPassword) {
    return res.status(400).send("New passwords do not match");
  }

  // Check if newPassword is valid
  if (!newPassword || newPassword.trim() === "") {
    return res.status(400).send("Password cannot be empty");
  }

  try {
    // Query the database to fetch the user by email
    const result = await client.query('SELECT * FROM "ByteCard".users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).send("User not found");
    }

    // Log the user object to ensure it is correct
    console.log("User found:", user);

    // Hash the new password with salt rounds
    const saltRounds = 10;
    console.log("Hashing password with salt rounds:", saltRounds); // Log salt rounds
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password in the database
    await client.query('UPDATE "ByteCard".users SET password = $1 WHERE email = $2', [hashedPassword, email]);

    console.log("Password updated successfully for user:", email);

    // Set session and log the user in
    req.session.user = {
      name: user.name,
      email: user.email,
    };

    // Redirect to the dashboard after successful login
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error resetting password:", error); // Log the error
    res.status(500).send("Server error");
  }
});

app.post("/delete-account", async (req, res) => {
  const { password } = req.body;
  const userId = req.session.user.id; // Assuming you store user ID in session

  try {
      // Fetch the user from the database
      const result = await client.query('SELECT * FROM "ByteCard".users WHERE "userid" = $1', [userId]);
      const user = result.rows[0];

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ message: "Incorrect password" });
      }

      // Delete the user's associated cards first
      await client.query('DELETE FROM "ByteCard".cards WHERE "userid" = $1', [userId]);

      // Now delete the user
      await client.query('DELETE FROM "ByteCard".users WHERE "userid" = $1', [userId]);

      // Destroy the session and send a response
      req.session.destroy((err) => {
          if (err) {
              console.error("Error destroying session:", err);
              return res.status(500).json({ message: "Failed to log out" });
          }
          res.status(200).json({ message: "Account deleted successfully" });
      });
  } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Error deleting account" });
  }
});





app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
      console.log("Login attempt with email:", email); 

      const result = await client.query('SELECT * FROM "ByteCard".users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
          console.log("Login failed: Invalid email"); 
          return res.status(400).send("Invalid email or password");
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          console.log("Login failed: Incorrect password"); 
          return res.status(400).send("Invalid email or password");
      }

      // Set session data
      req.session.user = {
          id: user.userid,  // Ensure the user ID is included in the session
          name: user.name,
          email: user.email,
      };

      console.log("Login successful. Session set:", req.session.user); 
      res.redirect("/dashboard");
  } catch (error) {
      console.error("Error during login:", error); 
      res.status(500).send("Server error");
  }
});


app.post("/register", async (req, res) => {
  const { name, email, password, confirmpassword } = req.body;

  if (password !== confirmpassword) {
    return res.render("register", { error: "Passwords do not match", name, email });
  }

  try {
    // Check if the user already exists
    const userCheck = await client.query('SELECT * FROM "ByteCard".users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.render("register", { error: "Email already registered", name, email });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the user into the database
    await client.query(
      'INSERT INTO "ByteCard".users (name, email, password) VALUES ($1, $2, $3)',
      [name, email, hashedPassword]
    );

    res.redirect("/login"); // Redirect to login page after successful registration
  } catch (error) {
    console.error(error);
    res.render("register", { error: "Server error. Please try again later.", name, email });
  }
}); 



app.get("/logout", (req, res) => {
  console.log("Logging out. Destroying session for user:", req.session.user);

  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return res.status(500).send("Unable to log out");
    }

    console.log("Session destroyed successfully. Redirecting to login.");
    res.redirect("/login");
  });
});



// Start the server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
