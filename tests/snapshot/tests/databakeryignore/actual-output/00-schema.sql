CREATE DATABASE IF NOT EXISTS data_bakery_test;
USE data_bakery_test;

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255),
    email VARCHAR(255)
);

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    amount INT
);
