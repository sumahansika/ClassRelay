
const Faculty = require("../models/Faculty");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (faculty) => {
    return jwt.sign(
        {
            id: faculty._id,
            role: faculty.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};

// Faculty Registration
const registerFaculty = async (req, res) => {
    try {
        const { name, email, password, department, subjects } = req.body;

        // Check required fields
        if (!name || !email || !password || !department) {
            return res.status(400).json({
                message: "Please fill all required fields"
            });
        }

        // Check existing email
        const existingFaculty = await Faculty.findOne({ email });

        if (existingFaculty) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create faculty
        const faculty = await Faculty.create({
            name,
            email,
            password: hashedPassword,
            department,
            subjects: subjects || []
        });

        const token = generateToken(faculty);

        res.status(201).json({
            message: "Faculty registered successfully",
            token,
            faculty: {
                id: faculty._id,
                name: faculty.name,
                email: faculty.email,
                department: faculty.department,
                subjects: faculty.subjects,
                role: faculty.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
};

// Faculty Login
const loginFaculty = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password"
            });
        }

        const faculty = await Faculty.findOne({ email });

        if (!faculty) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            faculty.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = generateToken(faculty);

        res.status(200).json({
            message: "Login successful",
            token,
            faculty: {
                id: faculty._id,
                name: faculty.name,
                email: faculty.email,
                department: faculty.department,
                subjects: faculty.subjects,
                role: faculty.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};

module.exports = {
    registerFaculty,
    loginFaculty
};
