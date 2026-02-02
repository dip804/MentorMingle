-- Create the database (Render handles this)
-- Run this in Render's DB console or via script

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