
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 5001;

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "alumni_db",
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
    } else {
        console.log("✅ Connected to MySQL database.");
    }
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
app.get("/", (req, res) => {
    res.redirect("/alumni");
});

// Alumni Login Page
app.get("/alumni", (req, res) => {
    res.render("alumni/alumni-login", { message: "" });
});


// Alumni Login POST
app.post("/alumni", (req, res) => {
    const { email, password } = req.body;

    // Query database for alumni details
    db.query("SELECT * FROM alumni WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("❌ Database query error:", err);
            return res.render("alumni/alumni-login", { message: "❌ Error logging in." });
        }

        if (results.length === 0) {
            return res.render("alumni/alumni-login", { message: "❌ Invalid email or password." });
        }

        const alumni = results[0];
        const passwordMatch = await bcrypt.compare(password, alumni.password);

        if (!passwordMatch) {
            return res.render("alumni/alumni-login", { message: "❌ Invalid email or password." });
        }

        // Store alumni details in session
        req.session.alumni = {
            full_name: alumni.full_name,
            email: alumni.email,
            batch: alumni.batch,
        };

        res.redirect("/alumni/dashboard");
    });
});

// Alumni Logout Route
app.get("/alumni/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/alumni"));
});


app.get("/alumni/dashboard", (req, res) => {
    if (!req.session.alumni) return res.redirect("/alumni");

    const email = req.session.alumni.email;

    // Fetch the full alumni details by email
    db.query("SELECT alumni_name, email, batches FROM alumni WHERE email = ?", [email], (err, results) => {
        if (err) {
            console.error("❌ Error fetching alumni data:", err);
            return res.send("Error loading alumni data.");
        }

        if (results.length > 0) {
            const alumni = results[0];  // Fetching the first result
            res.render("alumni/alumni-dashboard", { alumni });  // Pass all data
        } else {
            res.send("No alumni data found.");
        }
    });
});




// View Events Route (Fixed session check)
app.get("/view-events", (req, res) => {
    if (!req.session.alumni) return res.redirect("/alumni");

    db.query("SELECT * FROM events", (err, results) => {
        if (err) {
            console.error("❌ Error fetching events:", err);
            return res.send("Error loading events.");
        }
        res.render("alumni/view-event", { events: results });
    });
});

// ✅ Fixed: Jobs Page Route (Corrected session check)
app.get("/view-job", (req, res) => {
    if (!req.session.alumni) return res.redirect("/alumni");

    db.query("SELECT * FROM jobs", (err, results) => {
        if (err) {
            console.error("❌ Error fetching jobs:", err);
            return res.send("Error loading jobs.");
        }
        res.render("alumni/view-job", { jobs: results }); // Ensure correct EJS path
    });
});

// ✅ Fixed: Fetch Alumni Based on Selected Batch (Changed route to avoid duplicate `/alumni`)
app.get("/alumni/batch", (req, res) => {
    const batch = req.query.batch || "";

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
            res.render("alumni/alumni.ejs", { alumni: result, selectedBatch: batch });
        }
    });
});

// ✅ Fixed: Logout Route (Redirects to `/alumni`)
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/alumni");
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
