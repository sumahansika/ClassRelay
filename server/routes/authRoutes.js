
const express = require("express");

const router = express.Router();

const {
    registerFaculty,
    loginFaculty
} = require("../controllers/authController");

// Faculty Registration API
router.post("/register", registerFaculty);

// Faculty Login API
router.post("/login", loginFaculty);

module.exports = router;
