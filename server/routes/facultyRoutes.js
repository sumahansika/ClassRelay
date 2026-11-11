const express = require("express");
const router = express.Router();

const { getMyProfile } = require("../controllers/facultyController");
const { protect } = require("../middleware/authMiddleware");

router.get("/me", protect, getMyProfile);

module.exports = router;