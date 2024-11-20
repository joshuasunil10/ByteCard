const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { Client } = require("pg");

// Initialize Express app
const app = express();

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as the template engine
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Connect to PostgreSQL database
const client = new Client({
  user: "joshua",
  host: "localhost",
  database: "postgres",
  password: "1234",
  port: 54321,
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err) => console.error("Connection error", err.stack));

// Define routes
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/home", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.get("/cardcreator", (req, res) => {
  res.render("cardcreator");
});

// User Registration Route
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

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Check if the user exists
      const result = await client.query('SELECT * FROM "ByteCard".users WHERE email = $1', [email]);
      const user = result.rows[0];
  
      console.log("Retrieved User:", user); // Log user data
  
      if (!user) {
        return res.status(400).send("Invalid email or password");
      }
  
      // Compare the password
      console.log("Provided Password:", password);
      console.log("Stored Hash:", user.password);
      
  
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password Match:", isMatch); // Log password match status
  
      if (!isMatch) {
        return res.status(400).send("Invalid email or password");
      }
  
      // Redirect to the dashboard on successful login
      res.redirect("/dashboard");
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  });


// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
