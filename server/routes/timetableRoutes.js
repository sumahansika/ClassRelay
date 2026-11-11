
const express = require("express");
const router = express.Router();

const {
    addTimetable,
    getTimetable
} = require("../controllers/timetableController");

const {
    protect,
    authorizeHOD
} = require("../middleware/authMiddleware");

// Only HOD can add timetable entries
router.post("/add", protect, authorizeHOD, addTimetable);

// Logged-in faculty can view timetable
router.get("/", protect, getTimetable);

module.exports = router;
