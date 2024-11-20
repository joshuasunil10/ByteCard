const express = require('express');
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.set('view engine', 'ejs');


app.use(express.static("public"));


app.get("/", (req, res) => {
    res.render("home");
});


// Define the root route for Search
app.get("/search", (req, res) => {
    res.render("search");
});


const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
