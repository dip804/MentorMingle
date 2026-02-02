require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg"); // Use PostgreSQL

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL Connection (Render provides DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render
});

// Middleware
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
}));

// Routes from adminn
app.get("/", (req, res) => res.redirect("/admin"));
app.get("/admin", (req, res) => res.render("admin/admin-login", { message: "" }));
app.post("/admin", (req, res) => {
    const { email, password } = req.body;
    if (email === "admin@example.com" && password === "admin@108") {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
    }
    res.render("admin/admin-login", { message: "❌ Incorrect email or password." });
});
app.get("/admin/logout", (req, res) => { req.session.destroy(() => res.redirect("/admin")); });
app.get("/admin/dashboard", (req, res) => { if (!req.session.admin) return res.redirect("/admin"); res.render("admin/admin-dashboard"); });

// Add more admin routes here (alumni, events, jobs) - copy from admin.js but use pool.query

// Routes from alumni
app.get("/alumni", (req, res) => res.render("alumni/alumni-login", { message: "" }));
// Add alumni login, dashboard, etc. - copy from alumni.js

// Routes from hackathon
app.get("/login", (req, res) => res.render("login.ejs", { loginMessage: "" }));
// Add hackathon routes - copy from server.js

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));