// const express = require("express");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const stationRoutes = require("./routes/stationRoutes");

// const app = express();
// connectDB();

// app.use(cors());
// app.use(express.json());

// app.use("/api/stations", stationRoutes);

// app.listen(5000, () => {
//   console.log("🚀 Server running on http://localhost:5000");
// });


// const express = require("express");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const connectDB = require("./config/db");

// dotenv.config();
// connectDB();

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/stations", require("./routes/stationRoutes"));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const stationUpdater = require("./utils/stationUpdater"); // Auto-update function
const stationRoutes = require('./routes/stationRoutes');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json());
app.use(morgan("dev")); // Logging for debugging

// Serve static frontend files
app.use(express.static(path.join(__dirname, "frontend")));

// API Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/stations", require("./routes/stationRoutes"));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(500).json({ message: "Server Error" });
});

// Auto-Update Station Status every 10 sec
stationUpdater.start();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));