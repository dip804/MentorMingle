require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 5000;

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "alumni_db",
});

db.connect((err) => {
    if (err) console.error("Database connection failed:", err);
    else console.log("✅ Connected to MySQL database.");
});

// Middleware Setup
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET || "secret",
        resave: false,
        saveUninitialized: true,
    })
);

// Root Route
app.get("/", (req, res) => res.redirect("/admin"));

// Admin Login Page
app.get("/admin", (req, res) => res.render("admin/admin-login", { message: "" }));

// Admin Login POST
app.post("/admin", (req, res) => {
    const { email, password } = req.body;
    if (email === "admin@example.com" && password === "admin@108") {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
    }
    res.render("admin/admin-login", { message: "❌ Incorrect email or password." });
});

// Admin Logout
app.get("/admin/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/admin"));
});

// Admin Dashboard
app.get("/admin/dashboard", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    res.render("admin/admin-dashboard");
});

// Add Alumni Page
app.get("/admin/alumni/add", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    res.render("admin/add-alumni", { message: "" });
});

// Handle Add Alumni
app.post("/admin/alumni/add", async (req, res) => {
    const { alumni_name, email, password,batches } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query("SELECT email FROM alumni WHERE email = ?", [email], (err, result) => {
        if (result.length > 0) {
            return res.render("admin/add-alumni", { message: "❌ Email already exists." });
        } else {
            db.query(
                "INSERT INTO alumni (alumni_name, email, password, batches) VALUES (?, ?, ?, ?)",
                [alumni_name, email, hashedPassword, batches],
                (err) => {
                    if (err) return res.render("admin/add-alumni", { message: "❌ Error adding alumni." });
                    res.redirect("/admin/alumni/view");
                }
            );
        }
    });
    
});

// View Alumni
app.get("/admin/alumni/view", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    db.query("SELECT * FROM alumni", (err, results) => {
        if (err) return res.send("Error loading alumni.");
        res.render("admin/view-alumni", { alumni: results });
    });
});

// Manage Alumni
app.get("/admin/alumni/manage", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    db.query("SELECT * FROM alumni", (err, alumni) => {
        if (err) return res.send("Error loading alumni.");
        res.render("admin/manage-alumni", { alumni });
    });
});

// Delete Alumni
app.post("/admin/alumni/delete", (req, res) => {
    if (!req.session.admin) return res.status(403).send("Unauthorized");
    const { alumni_id } = req.body;
    db.query("DELETE FROM alumni WHERE id = ?", [alumni_id], (err) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to delete alumni" });
        res.json({ success: true, message: "Alumni deleted successfully" });
    });
});

// Add Event Page
app.get("/admin/alumni/event", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    res.render("admin/add-event", { message: "" });
});

// Handle Add Event
app.post("/admin/alumni/event", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    const { title, type, date, time, location, description, seats, enrolled } = req.body;
    const enrolledValue = enrolled === "true" ? 1 : 0;
    db.query(
        "INSERT INTO events (title, type, date, time, location, description, seats, enrolled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [title, type, date, time, location, description, seats, enrolledValue],
        (err) => {
            if (err) return res.status(500).send("Error adding event");
            res.redirect("/admin/event/view");
        }
    );
});

// View Events
app.get("/admin/event/view", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    db.query("SELECT * FROM events", (err, results) => {
        if (err) return res.send("Error loading events.");
        res.render("admin/view-event", { events: results });
    });
});


app.get("/admin/alumni/job", (req, res) => {
    res.render("admin/add-job", { message: null }); // Ensure message is defined
});


app.post("/admin/alumni/job", (req, res) => {
    const { title, company, type, description, url } = req.body;

    const sql = "INSERT INTO jobs (title, company, type, description, url) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, company, type, description, url], (err, result) => {
        if (err) {
            console.error("Error inserting job:", err);
            return res.render("admin/add-job", { message: "❌ Error adding job to the database." });
        }
        res.redirect("/admin/jobs");
    });
});


// Show all jobs
app.get("/admin/jobs", (req, res) => {
    db.query("SELECT * FROM jobs", (err, results) => {
        if (err) {
            console.error("Error fetching jobs:", err);
            return res.send("Error loading jobs.");
        }
        res.render("admin/view-job", { jobs: results });
    });
});



// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
