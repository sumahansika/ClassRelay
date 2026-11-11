
const express = require("express");
const router = express.Router();

const {
    applyLeave,
    getPendingLeaves,
    reviewLeave
} = require("../controllers/leaveController");

const {
    protect,
    authorizeHOD
} = require("../middleware/authMiddleware");

// Faculty applies for leave
router.post("/apply", protect, applyLeave);

// Only HOD can view pending leave requests
router.get("/pending", protect, authorizeHOD, getPendingLeaves);

// Only HOD can approve or reject leave
router.put("/review/:id", protect, authorizeHOD, reviewLeave);

module.exports = router;
