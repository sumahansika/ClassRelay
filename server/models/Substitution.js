
const mongoose = require("mongoose");

const substitutionSchema = new mongoose.Schema(
    {
        leave: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Leave",
            required: true
        },

        absentFaculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Faculty",
            required: true
        },

        substituteFaculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Faculty",
            default: null
        },

        department: {
            type: String,
            required: true
        },

        subject: {
            type: String,
            required: true
        },

        date: {
            type: Date,
            required: true
        },

        dayOfWeek: {
            type: String,
            required: true
        },

        period: {
            type: Number,
            required: true
        },

        startTime: {
            type: String,
            required: true
        },

        endTime: {
            type: String,
            required: true
        },

        room: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "offered",
                "accepted",
                "rejected",
                "completed"
            ],
            default: "pending"
        },

        offeredTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Faculty",
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Substitution", substitutionSchema);
