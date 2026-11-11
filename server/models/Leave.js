const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Faculty",
            required: true
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        reason: {
            type: String,
            required: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Faculty",
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);