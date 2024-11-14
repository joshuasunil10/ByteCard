const express = require('express');
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.set('view engine', 'ejs');


app.use(express.static("public"));


app.get("/", (req, res) => {
    res.render("home");
});



// Define the root route for login
app.get("/login", (req, res) => {
    res.render("login");
});

// Define the signup route
app.get("/register", (req, res) => {
    res.render("register");
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
