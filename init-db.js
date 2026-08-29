require("dotenv").config();
const { initializeDatabase } = require("../database");

initializeDatabase()
  .then(() => {
    console.log("TMR PostgreSQL database initialized successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
