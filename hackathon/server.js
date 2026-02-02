require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");

const app = express();
const PORT = process.env.PORT || 9000;

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "alumni_db",
});

db.connect((err) => {
    if (err) console.error("❌ Database connection failed:", err);
    else console.log("✅ Connected to MySQL database.");
});

// Middleware Setup
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || "secret",
        resave: false,
        saveUninitialized: false,
    })
);


// ---------- ROUTES ----------

// Home (Landing Page)
app.get("/", (req, res) => {
    res.render("landing.ejs");
});

// Login Page
app.get("/login", (req, res) => {
    res.render("login.ejs", { loginMessage: "" });
});

// Registration Page
app.get("/register", (req, res) => {
    res.render("register.ejs", { message: "" });
});

app.get("/mentor", (req, res) => {
    res.render("mentor.ejs", { loginMessage: "" });
});

app.get("/opensource", (req, res) => {
    res.render("opensource.ejs", { loginMessage: "" });
});
app.get("/donation", (req, res) => {
    res.render("donation.ejs", { loginMessage: "" });
});


// Dashboard Page (Only for Logged-in Users)
app.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login"); // Redirect to login if not authenticated
    }
    res.render("dashboard.ejs", { user: req.session.user });
});


// User Registration
app.post("/register", async (req, res) => {
    const { fullName, email, password, userType, graduationYear, department } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (full_name, email, password, user_type, graduation_year, department) 
                     VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(sql, [fullName, email, hashedPassword, userType, graduationYear || null, department], (err) => {
            if (err) {
                console.error("❌ Registration Error:", err);
                return res.render("register.ejs", { message: "Registration failed! Try again." });
            }
            res.redirect("/login");
        });
    } catch (error) {
        console.error("❌ Hashing Error:", error);
        res.status(500).send("Internal server error");
    }
});

// User Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("❌ Login Error:", err);
            return res.render("login.ejs", { loginMessage: "Internal Server Error" });
        }

        if (results.length === 0) {
            return res.render("login.ejs", { loginMessage: "Invalid email or password" });
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.render("login.ejs", { loginMessage: "Invalid email or password" });
        }

        req.session.user = user; // Store session
        res.redirect("/dashboard");
    });
});



app.get("/dashboard", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    try {
        const userId = req.session.user.id;
        db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
            if (err) {
                console.error("❌ Error fetching user data:", err);
                return res.status(500).send("Error fetching user data");
            }

            if (results.length === 0) {
                return res.redirect("/login");
            }

            const user = results[0];
            res.render("dashboard.ejs", { user });
        });
    } catch (err) {
        console.error("❌ Error fetching session data:", err);
        res.status(500).send("Error fetching session data");
    }
});



app.get("/view-events", (req, res) => {
    if (!req.session.user) return res.redirect("/login"); // Ensure user is logged in

    db.query("SELECT * FROM events", (err, results) => {
        if (err) {
            console.error("❌ Error fetching events:", err);
            return res.send("Error loading events.");
        }
        res.render("view-event.ejs", { events: results }); // Pass event data to EJS template
    });
});

// Route for jobs page
app.get("/view-job", (req, res) => {
    if (!req.session.user) return res.redirect("/login"); // Ensure user is logged in

    db.query("SELECT * FROM jobs", (err, results) => {
        if (err) {
            console.error("❌ Error fetching jobs:", err);
            return res.send("Error loading jobs.");
        }
        res.render("view-job.ejs", { jobs: results }); // Pass job data to EJS template
    });
});


// // Route for alumni batches
// app.get("/alumni", (req, res) => {
//     const currentYear = new Date().getFullYear();
//     const batches = [];

//     for (let year = 2000; year <= currentYear; year++) {
//         batches.push({ year: year, members: Math.floor(Math.random() * 50) + 1 }); // Random members
//     }

//     res.render("alumni.ejs", { batches });
// });


// Fetch Alumni Based on Selected Batch
app.get("/alumni", (req, res) => {
    const batch = req.query.batch || ""; // Get selected batch from query parameter

    let sql = "SELECT * FROM alumni";
    let params = [];

    if (batch) {
        sql += " WHERE batches = ?";
        params.push(batch);
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.log(err);
            res.send("Error fetching data");
        } else {
            res.render("alumni.ejs", { alumni: result, selectedBatch: batch });
        }
    });
});



// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
