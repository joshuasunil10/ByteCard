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
  host: "localhost",
  database: "postgres",
  password: "1234",
  port: 5432,
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err) => console.error("Connection error", err.stack));
  
// Middleware to check session (require login)
const requireLogin = (req, res, next) => {
  console.log("Checking session in requireLogin:", req.session.user);
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

// Routes
app.get("/", (req, res) => {
  console.log("Home route accessed. Current session:", req.session.user);
  res.render("home", { user: req.session.user });
});

app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const result = await client.query('SELECT c.card_name, c.card_position, c.card_company, t.tagname FROM "ByteCard".card c JOIN "ByteCard".tag t ON c.tag_tagid = t.tagid WHERE c.user_userid = $1', [req.session.user.id]);
    const cards = result.rows;
    res.render("dashboard", { user: req.session.user, cards });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.render("dashboard", { user: req.session.user, cards: [] });
  }
});

app.route("/login")
  .get((req, res) => {
    // Redirect to dashboard if already logged in
    if (req.session.user) {
      return res.redirect("/dashboard");
    }
    res.render("login");
  })
  .post(async (req, res) => {
    const { email, password } = req.body;

    try {
      // Query user by email
      const result = await client.query(
        'SELECT * FROM "ByteCard".user WHERE email = $1',
        [email]
      );
      const user = result.rows[0];

      // Validate user existence and password
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send("Invalid email or password");
      }

      // Set session data
      req.session.user = {
        id: user.userid,
        name: user.name,
        email: user.email,
      };

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).send("Server error. Please try again later.");
    }
  });


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Unable to log out");
    res.redirect("/login");
  });
});


app.route("/register")
  .get((req, res) => {
    
    res.render("register");
  })
  .post(async (req, res) => {
    const { name, email, password, confirmpassword } = req.body;

    // Validate password confirmation
    if (password !== confirmpassword) {
      return res.status(400).send("Passwords do not match.");
    }

    try {
      // Check if the user already exists
      const userCheck = await client.query(
        'SELECT * FROM "ByteCard".user WHERE email = $1',
        [email]
      );
      if (userCheck.rows.length > 0) {
        return res.status(409).send("Email is already registered.");
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user 
      await client.query(
        'INSERT INTO "ByteCard".user (name, email, password) VALUES ($1, $2, $3)',
        [name, email, hashedPassword]
      );

      res.redirect("/login");
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).send("Server error. Please try again later.");
    }
  });

app.post("/createByteCard", requireLogin, async (req, res) => {
  const { cardName, cardPosition, cardCompany, cardDescription, cardContact, visibility, tagId } = req.body;
  const userId = req.session.user.id;

  const visibilityValue = visibility === 'yes' ? 'Y' : 'N';

  try {
    //insert enetered data into new card
    await client.query(
      `INSERT INTO "ByteCard".card (card_name, card_position, card_company, visibility, card_description, card_contact, user_userid, tag_tagid) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [cardName, cardPosition, cardCompany, visibilityValue,  cardDescription, cardContact, userId, tagId]
    );
    console.log("ByteCard created successfully for user:", userId);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error creating ByteCard:", error);
    res.status(500).send("Error creating ByteCard");
  }
});



app.route("/search")
  .get(async (req, res) => {
    try {
      // Fetch all visible cards
      const result = await client.query(`
        SELECT c.cardid, c.card_name, c.card_position, c.card_company, t.tagname
        FROM "ByteCard".card c
        JOIN "ByteCard".tag t ON c.tag_tagid = t.tagid
        WHERE c.visibility = 'Y'
      `);
      res.render("search", { user: req.session.user, cards: result.rows });
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.render("search", { user: req.session.user, cards: [] });
    }
  })
  .post(async (req, res) => {
    const { query, column } = req.body;
    const validColumns = ["card_name", "card_position", "card_company", "tagname"];

    try {
      // Validate column input
      if (!validColumns.includes(column)) {
        return res.status(400).send("Invalid search column.");
      }

      // Fetch card relevent to column selected
      const result = await client.query(
        `
        SELECT c.cardid, c.card_name, c.card_position, c.card_company, t.tagname
        FROM "ByteCard".card c
        JOIN "ByteCard".tag t ON c.tag_tagid = t.tagid
        WHERE c.visibility = 'Y' AND ${column} ILIKE $1
      `,
        [`%${query}%`]
      );

      res.render("search", { user: req.session.user, cards: result.rows });
    } catch (error) {
      console.error("Error searching cards:", error);
      res.render("search", { user: req.session.user, cards: [] });
    }
  });


app.get("/carddetail", requireLogin, async (req, res) => {
  try {
    const cardId = req.query.id;
    if (!cardId) {
      return res.status(400).send("Card ID is required");
    }

    const query = `
      SELECT cardid, card_name, card_position, card_company, card_description,card_contact, tagname
      FROM "ByteCard".card
      JOIN "ByteCard".tag
      ON "ByteCard".card.tag_tagid = "ByteCard".tag.tagid
      WHERE "ByteCard".card.cardid = $1
    `;
    const result = await client.query(query, [cardId]);

    if (result.rows.length === 0) {
      return res.status(404).send("Card not found");
    }

    const card = result.rows[0];

    // Generate the logo URL using the company name form API
    const logoUrl = `https://img.logo.dev/${encodeURIComponent(card.card_company)}.com?token=pk_Juu8uvxFS8GChJyDrMDTtA`;

    res.render("carddetail", { card, logoUrl, user: req.session.user });
  } catch (error) {
    console.error("Error fetching card details:", error);
    res.status(500).send("Server error");
  }
});

app.route("/forgot-password")
  .get((req, res) => {
    res.render("forgot-password");
  })
  .post(async (req, res) => {
    const { email } = req.body;

    try {
      // Check if the email exists in the database
      const result = await client.query(
        'SELECT email FROM "ByteCard".user WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Email not found.");
      }

      res.render("reset-password", { email });
    } catch (error) {
      console.error("Error during forgot-password process:", error);
      res.status(500).send("Server error. Please try again later.");
    }
  });



  app.post("/reset-password", async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;
  
    // Validate input
    if (!newPassword || newPassword.trim() === "" || newPassword !== confirmPassword) {
      return res.status(400).send("Passwords must match and cannot be empty.");
    }
  
    try {
      // Check if the email exists
      const result = await client.query(
        'SELECT * FROM "ByteCard".user WHERE email = $1',
        [email]
      );
      const user = result.rows[0];
  
      if (!user) {
        return res.status(404).send("User not found.");
      }
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      await client.query(
        'UPDATE "ByteCard".user SET password = $1 WHERE email = $2',
        [hashedPassword, email]
      );
  
      console.log(`Password updated successfully for user: ${email}`);
  
      res.redirect("/login");
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).send("Server error. Please try again later.");
    }
  });
  
  app.post("/delete-account", requireLogin, async (req, res) => {
    const { password } = req.body;
  
    try {
      const userId = req.session.user.id;
  
      // Fetch the user to verify the password
      const result = await client.query(
        'SELECT password FROM "ByteCard".user WHERE userid = $1',
        [userId]
      );
      const user = result.rows[0];
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      // Validate the password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Incorrect password." });
      }
  
      await client.query('DELETE FROM "ByteCard".card WHERE user_userid = $1', [userId]);
  
      await client.query('DELETE FROM "ByteCard".user WHERE userid = $1', [userId]);
  
      // Destroy the session and send a success response
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Failed to log out." });
        }
        res.status(200).json({ message: "Account deleted successfully." });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Server error. Please try again later." });
    }
  });
  

  app.get("/addcard", requireLogin, async (req, res) => {
    try {
      // Fetch available tags
      const { rows: tags } = await client.query(
        'SELECT tagid, tagname FROM "ByteCard".tag'
      );
  
      res.render("addCard", { user: req.session.user, tags });
    } catch (error) {
      console.error("Error fetching tags:", error);
  
      res.render("addCard", { user: req.session.user, tags: [] });
    }
  });
  

  app.post("/deletecard", requireLogin, async (req, res) => {
    const { cardId } = req.body;
  
    try {
      const userId = req.session.user.id;
  
      // Verify card ownership
      const { rows } = await client.query(
        'SELECT 1 FROM "ByteCard".card WHERE cardid = $1 AND user_userid = $2',
        [cardId, userId]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ message: "Card not found or does not belong to the user." });
      }
  
      await client.query('DELETE FROM "ByteCard".card WHERE cardid = $1', [cardId]);
  
      res.status(200).json({ message: "Card deleted successfully." });
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ message: "Server error. Please try again later." });
    }
  });
  

  app.get("/dashboard", requireLogin, async (req, res) => {
    try {
      // Fetch available tags
      const { rows: tags } = await client.query(
        'SELECT tagid, tagname FROM "ByteCard".tag'
      );
  
      res.render("dashboard", { user: req.session.user, tags });
    } catch (error) {
      console.error("Error fetching tags for dashboard:", error);
  
      res.render("dashboard", { user: req.session.user, tags: [] });
    }
  });
  


  app.post("/createByteCard", requireLogin, async (req, res) => {
    const { cardName, cardPosition, cardCompany, visibility, tagIds } = req.body;
    const userId = req.session.user.id;
  
    try {
      // Ensure tagIds is an array and handle empty cases
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).send("At least one tag must be selected.");
      }
  
      // Validate inputs
      if (!cardName || !cardPosition || !cardCompany) {
        return res.status(400).send("All card details must be provided.");
      }
  
      // Prepare the query for bulk insertion
      const values = tagIds.map((tagId) => [
        cardName,
        cardPosition,
        cardCompany,
        visibility === "yes" ? "Y" : "N", // Convert visibility
        userId,
        tagId,
      ]);
  
      const query = `
        INSERT INTO "ByteCard".card (card_name, card_position, card_company, visibility, user_userid, tag_tagid) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
  
      // Execute all insertions in a transaction
      await Promise.all(values.map((value) => client.query(query, value)));
  
      console.log(`ByteCards created successfully for user: ${userId}`);
      res.redirect("/dashboard");
    } catch (error) {
      console.error("Error creating ByteCard:", error);
      res.status(500).send("Error creating ByteCard. Please try again later.");
    }
  });

// Start the server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
