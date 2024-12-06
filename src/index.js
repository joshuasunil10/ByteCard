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
  user: "joshua",
  host: "10.156.2.142",
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

app.get("/carddetail",requireLogin,(req, res) => {
  console.log("Login page accessed. Current session:", req.session.user); 
  res.render("carddetail");
});



app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
      console.log("Login attempt with email:", email); 

      const result = await client.query('SELECT * FROM "ByteCard".user WHERE email = $1', [email]);
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


app.get("/register", (req, res) => {
  console.log("Register page accessed. Current session:", req.session.user); 
  res.render("register");
});

app.get("/search", async (req, res) => {
  try {
    const query = `
      SELECT card_name, card_position, card_company, tagname 
      FROM "ByteCard".card 
      JOIN "ByteCard".tag 
      ON "ByteCard".card.tag_tagid = "ByteCard".tag.tagid
    `;

    const result = await client.query(query);
    const cards = result.rows;

    console.log("Loaded all cards:", cards);

    res.render("search", { cards });
  } catch (error) {
    console.error("Error fetching all cards:", error);

    res.render("search", { cards: [] });
  }
});

app.post("/search", async (req, res) => {
  try {
    const searchQuery = req.body.query || "";
    const column = req.body.column || "card_name";

    const validColumns = ["card_name", "card_position", "card_company", "tagname"];
    if (!validColumns.includes(column)) {
      throw new Error("Invalid column selected");
    }

    let query;
    let params;

    if (searchQuery.trim() === "") {
      query = `
        SELECT card_name, card_position, card_company, tagname 
        FROM "ByteCard".card 
        JOIN "ByteCard".tag 
        ON "ByteCard".card.tag_tagid = "ByteCard".tag.tagid
      `;
      params = [];
    } else {
      query = `
        SELECT card_name, card_position, card_company, tagname 
        FROM "ByteCard".card 
        JOIN "ByteCard".tag 
        ON "ByteCard".card.tag_tagid = "ByteCard".tag.tagid
        WHERE ${column} ILIKE $1
      `;
      params = [`%${searchQuery}%`];
    }

    const result = await client.query(query, params);

    const cards = result.rows;

    console.log("Query Result:", cards);

    res.render("search", { cards });
  } catch (error) {
    console.error("Error fetching cards:", error);

    res.render("search", { cards: [] });
  }
});


app.post("/search", async (req, res) => {
  try {
    const searchQuery = req.body.query || "";
    const column = req.body.column || "card_name";

    const validColumns = ["card_name", "card_position", "card_company", "tagname"];
    if (!validColumns.includes(column)) {
      throw new Error("Invalid column selected");
    }

    const query = `
      SELECT card_name, card_position, card_company, tagname 
      FROM "ByteCard".card 
      JOIN "ByteCard".tag 
      ON "ByteCard".card.tag_tagid = "ByteCard".tag.tagid
      WHERE ${column} ILIKE $1
    `;

    const result = await client.query(query, [`%${searchQuery}%`]);

    const cards = result.rows;

    console.log("Filtered Query Result:", cards);

    res.render("search", { cards });
  } catch (error) {
    console.error("Error fetching cards:", error);

    res.render("search", { cards: [] });
  }
});






app.get("/forgot-password", (req, res) => {
  res.render("forgot-password"); 
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Query the database to see if the email exists
    const result = await client.query('SELECT * FROM "ByteCard".user WHERE email = $1', [email]);
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
    const result = await client.query('SELECT * FROM "ByteCard".user WHERE email = $1', [email]);
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
    await client.query('UPDATE "ByteCard".user SET password = $1 WHERE email = $2', [hashedPassword, email]);

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

  // Check if the user is logged in by verifying the session
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: "User not logged in" });
  }

  const userId = req.session.user.id; // Now we can safely use it
  
  try {
    // Fetch the user from the database
    const result = await client.query('SELECT * FROM "ByteCard".user WHERE "userid" = $1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // First, delete the user's cards (if any)
    await client.query('DELETE FROM "ByteCard".card WHERE "user_userid" = $1', [userId]);

    // Now delete the user
    await client.query('DELETE FROM "ByteCard".user WHERE "userid" = $1', [userId]);

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

app.get("/dashboard", requireLogin, async (req, res) => {
  try {
      const result = await client.query('SELECT tagid, tagname FROM "ByteCard".tag');
      console.log("Tags fetched:", result.rows);
      const tags = result.rows; // Fetch available tags
      res.render("dashboard", { user: req.session.user, tags });
  } catch (error) {
      console.error("Error fetching tags:", error);
      res.render("dashboard", { user: req.session.user, tags: [] }); // Pass an empty array in case of error
  }
});


// Route to handle ByteCard creation
app.post("/createByteCard", requireLogin, async (req, res) => {
  const { cardName, cardPosition, cardCompany, visibility, tagIds } = req.body; // tagIds as array
  const userId = req.session.user.id;

  // Loop through tagIds and insert ByteCards accordingly (if multiple tags are selected)
  try {
    for (const tagId of tagIds) {
      await client.query(
        `INSERT INTO "ByteCard".card (card_name, card_position, card_company, visibility, user_userid, tag_tagid) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [cardName, cardPosition, cardCompany, visibility, userId, tagId]
      );
    }
    console.log("ByteCard created successfully for user:", userId);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error creating ByteCard:", error);
    res.status(500).send("Error creating ByteCard");
  }
});





// Start the server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
