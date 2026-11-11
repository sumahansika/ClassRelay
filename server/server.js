
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const substitutionRoutes = require("./routes/substitutionRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/substitutions", substitutionRoutes);

app.get("/", (req, res) => {
    res.send("Welcome to ClassRelay Backend!");
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");

        app.listen(process.env.PORT || 5000, () => {
            console.log("ClassRelay server running on port 5000");
        });
    })
    .catch((error) => {
        console.error("MongoDB Connection Failed:", error.message);
    });
