require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createTables() {
    const schema = `
        CREATE TABLE IF NOT EXISTS alumni (
            id SERIAL PRIMARY KEY,
            alumni_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            batches VARCHAR(50)
        );
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            type VARCHAR(50),
            date DATE,
            time TIME,
            location VARCHAR(255),
            description TEXT,
            seats INT,
            enrolled BOOLEAN DEFAULT FALSE
        );
        CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            company VARCHAR(255),
            type VARCHAR(50),
            description TEXT,
            url VARCHAR(255)
        );
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            user_type VARCHAR(50),
            graduation_year INT,
            department VARCHAR(100)
        );
    `;
    try {
        await pool.query(schema);
        console.log("Tables created.");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
}
createTables();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
}));

// Admin Routes
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

app.get("/admin/alumni/add", (req, res) => { if (!req.session.admin) return res.redirect("/admin"); res.render("admin/add-alumni", { message: "" }); });
app.post("/admin/alumni/add", async (req, res) => {
    const { alumni_name, email, password, batches } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    pool.query("SELECT email FROM alumni WHERE email = $1", [email], (err, result) => {
        if (result.rows.length > 0) return res.render("admin/add-alumni", { message: "❌ Email already exists." });
        pool.query("INSERT INTO alumni (alumni_name, email, password, batches) VALUES ($1, $2, $3, $4)", [alumni_name, email, hashedPassword, batches], (err) => {
            if (err) return res.render("admin/add-alumni", { message: "❌ Error adding alumni." });
            res.redirect("/admin/alumni/view");
        });
    });
});
app.get("/admin/alumni/view", (req, res) => { if (!req.session.admin) return res.redirect("/admin"); pool.query("SELECT * FROM alumni", (err, results) => { if (err) return res.send("Error"); res.render("admin/view-alumni", { alumni: results.rows }); }); });
app.get("/admin/alumni/manage", (req, res) => { if (!req.session.admin) return res.redirect("/admin"); pool.query("SELECT * FROM alumni", (err, results) => { if (err) return res.send("Error"); res.render("admin/manage-alumni", { alumni: results.rows }); }); });
app.post("/admin/alumni/delete", (req, res) => { if (!req.session.admin) return res.status(403).send("Unauthorized"); const { alumni_id } = req.body; pool.query("DELETE FROM alumni WHERE id = $1", [alumni_id], (err) => { if (err) return res.json({ success: false }); res.json({ success: true }); }); });

app.get("/admin/alumni/event", (req, res) => { if (!req.session.admin) return res.redirect("/admin"); res.render("admin/add-event", { message: "" }); });
app.post("/admin/alumni/event", (req, res) => { if (!req.session.admin) return res.redirect("/admin"); const { title, type, date, time, location, description, seats, enrolled } = req.body; const enrolledValue = enrolled === "true"; pool.query("INSERT INTO events (title, type, date, time, location, description, seats, enrolled) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [title, type, date, time, location, description, seats, enrolledValue], (err) => { if (err) return res.send("Error"); res.redirect("/admin/event/view"); }); });
app.get("/admin/event/view", (req, res) => { if (!req.session.admin) return res.redirect("/admin"); pool.query("SELECT * FROM events", (err, results) => { if (err) return res.send("Error"); res.render("admin/view-event", { events: results.rows }); }); });

app.get("/admin/alumni/job", (req, res) => { res.render("admin/add-job", { message: null }); });
app.post("/admin/alumni/job", (req, res) => { const { title, company, type, description, url } = req.body; pool.query("INSERT INTO jobs (title, company, type, description, url) VALUES ($1, $2, $3, $4, $5)", [title, company, type, description, url], (err) => { if (err) return res.render("admin/add-job", { message: "❌ Error" }); res.redirect("/admin/jobs"); }); });
app.get("/admin/jobs", (req, res) => { pool.query("SELECT * FROM jobs", (err, results) => { if (err) return res.send("Error"); res.render("admin/view-job", { jobs: results.rows }); }); });

// Alumni Routes
app.get("/alumni", (req, res) => res.render("alumni/alumni-login", { message: "" }));
app.post("/alumni", async (req, res) => {
    const { email, password } = req.body;
    pool.query("SELECT * FROM alumni WHERE email = $1", [email], async (err, results) => {
        if (err) return res.render("alumni/alumni-login", { message: "❌ Error" });
        if (results.rows.length === 0) return res.render("alumni/alumni-login", { message: "❌ Invalid email or password." });
        const alumni = results.rows[0];
        const match = await bcrypt.compare(password, alumni.password);
        if (!match) return res.render("alumni/alumni-login", { message: "❌ Invalid email or password." });
        req.session.alumni = { full_name: alumni.alumni_name, email: alumni.email, batch: alumni.batches };
        res.redirect("/alumni/dashboard");
    });
});
app.get("/alumni/logout", (req, res) => { req.session.destroy(() => res.redirect("/alumni")); });
app.get("/alumni/dashboard", (req, res) => { if (!req.session.alumni) return res.redirect("/alumni"); pool.query("SELECT alumni_name, email, batches FROM alumni WHERE email = $1", [req.session.alumni.email], (err, results) => { if (err) return res.send("Error"); res.render("alumni/alumni-dashboard", { alumni: results.rows[0] }); }); });
app.get("/view-events", (req, res) => { if (!req.session.alumni) return res.redirect("/alumni"); pool.query("SELECT * FROM events", (err, results) => { if (err) return res.send("Error"); res.render("alumni/view-event", { events: results.rows }); }); });
app.get("/view-job", (req, res) => { if (!req.session.alumni) return res.redirect("/alumni"); pool.query("SELECT * FROM jobs", (err, results) => { if (err) return res.send("Error"); res.render("alumni/view-job", { jobs: results.rows }); }); });
app.get("/alumni/batch", (req, res) => { const batch = req.query.batch || ""; let sql = "SELECT * FROM alumni"; let params = []; if (batch) { sql += " WHERE batches = $1"; params = [batch]; } pool.query(sql, params, (err, result) => { if (err) return res.send("Error"); res.render("alumni/alumni.ejs", { alumni: result.rows, selectedBatch: batch }); }); });

// Hackathon Routes
app.get("/login", (req, res) => res.render("login.ejs", { loginMessage: "" }));
app.get("/register", (req, res) => res.render("register.ejs", { message: "" }));
app.post("/register", async (req, res) => {
    const { fullName, email, password, userType, graduationYear, department } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    pool.query("INSERT INTO users (full_name, email, password, user_type, graduation_year, department) VALUES ($1, $2, $3, $4, $5, $6)", [fullName, email, hashedPassword, userType, graduationYear || null, department], (err) => {
        if (err) return res.render("register.ejs", { message: "Registration failed!" });
        res.redirect("/login");
    });
});
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    pool.query("SELECT * FROM users WHERE email = $1", [email], async (err, results) => {
        if (err) return res.render("login.ejs", { loginMessage: "Error" });
        if (results.rows.length === 0) return res.render("login.ejs", { loginMessage: "Invalid email or password" });
        const user = results.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.render("login.ejs", { loginMessage: "Invalid email or password" });
        req.session.user = user;
        res.redirect("/dashboard");
    });
});
app.get("/dashboard", (req, res) => { if (!req.session.user) return res.redirect("/login"); res.render("dashboard.ejs", { user: req.session.user }); });
app.get("/logout", (req, res) => { req.session.destroy(() => res.redirect("/login")); });

// Other hackathon routes
app.get("/mentor", (req, res) => res.render("mentor.ejs"));
app.get("/opensource", (req, res) => res.render("opensource.ejs"));
app.get("/donation", (req, res) => res.render("donation.ejs"));
app.get("/ali", (req, res) => res.render("ali.ejs"));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));