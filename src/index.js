const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { Client } = require('pg');

// Connect to PostgreSQL database

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '1234',
    port: 54321,
});

client.connect()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => console.error('Connection error', err.stack));


module.exports = client;
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

app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
