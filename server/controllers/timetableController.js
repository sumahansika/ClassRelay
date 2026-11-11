
const Timetable = require("../models/Timetable");

// Add a new timetable entry
const addTimetable = async (req, res) => {
    try {
        const {
            faculty,
            department,
            subject,
            dayOfWeek,
            period,
            startTime,
            endTime,
            room
        } = req.body;

        if (
            !faculty ||
            !department ||
            !subject ||
            !dayOfWeek ||
            !period ||
            !startTime ||
            !endTime ||
            !room
        ) {
            return res.status(400).json({
                message: "Please provide all timetable details"
            });
        }

        const timetable = await Timetable.create({
            faculty,
            department,
            subject,
            dayOfWeek,
            period,
            startTime,
            endTime,
            room
        });

        res.status(201).json({
            message: "Timetable entry added successfully",
            timetable
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to add timetable entry",
            error: error.message
        });
    }
};

// View all timetable entries
const getTimetable = async (req, res) => {
    try {
        const timetable = await Timetable.find()
            .populate("faculty", "name email department subjects")
            .sort({ dayOfWeek: 1, period: 1 });

        res.status(200).json({
            message: "Timetable fetched successfully",
            count: timetable.length,
            timetable
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch timetable",
            error: error.message
        });
    }
};

module.exports = {
    addTimetable,
    getTimetable
};
