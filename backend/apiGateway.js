const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const cronJobs = require("./services/Clean");

// Route Handlers
const user = require("./routes/User");
const admin = require("./routes/admin");
const create = require("./routes/Create");
const login = require("./routes/Login");
const payRoute = require("./routes/PayRoute");
const report = require("./routes/Report");
const movie = require("./routes/movies");

const PORT = process.env.PORT || 8081;
const app = express();


// Database Connection with Retry Logic
async function connectToDatabase(retries = 5) {
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      break;
    } catch (error) {
      retries -= 1;
      `Retries left: ${retries}`;
      if (retries === 0) throw new Error("MongoDB connection failed");
      await new Promise((res) => setTimeout(res, 15000));
    }
  }
}


// Middleware for Security and Logging
app.use(express.json({ limit: "5gb" }));
app.use(express.urlencoded({ limit: "5gb", extended: true }));
app.use(cookieParser());
const corsOptions = {
  origin: ["https://streamify-o1ga.onrender.com","https://streamizz.site"],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.use((req, res, next) => {
  const allowedOrigins = ['https://streamizz.site'];
  const allowedHosts = ['streamify-o1ga.onrender.com'];
  
  // Check if the request's Origin or Host header matches the allowed values
 const origin = req.headers.origin;
  const host = req.headers.host;

  if (!allowedOrigins.includes(origin) || !allowedHosts.includes(host)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

// Serve Static Files with Headers
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));

// Define Routes
app.use("/api/netflix", login);
app.use("/api/admin", admin);
app.use("/api/user", user);
app.use("/api/payment", payRoute);
app.use("/api", movie);
app.use("/api/netflix/new", create);
app.use("/api/admin/reports", report);

app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("*", (req,res)=>{
  res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
})



cronJobs();
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      `Workeris running on http://localhost:${PORT}`;
    });
  })
  .catch((error) => {
    process.exit(1);
  });
