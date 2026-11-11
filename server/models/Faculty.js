
const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    department: {
        type: String,
        required: true
    },

    subjects: {
        type: [String],
        default: []
    },

    role: {
        type: String,
        enum: ["faculty", "hod"],
        default: "faculty"
    }

}, { timestamps: true });

module.exports = mongoose.model("Faculty", facultySchema);
