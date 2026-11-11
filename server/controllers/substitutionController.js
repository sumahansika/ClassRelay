
const Leave = require("../models/Leave");
const Timetable = require("../models/Timetable");
const Substitution = require("../models/Substitution");
const Faculty = require("../models/Faculty");

const generateSubstitutionRecords = require("../services/substitutionService");

// HOD generates substitution records for an approved leave
const generateSubstitutions = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.leaveId);

        if (!leave) {
            return res.status(404).json({
                message: "Leave request not found"
            });
        }

        if (leave.status !== "approved") {
            return res.status(400).json({
                message: "Only approved leave requests can generate substitutions"
            });
        }

        const result = await generateSubstitutionRecords(leave);

        return res.status(200).json({
            message: "Substitution records processed successfully",
            ...result
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to generate substitution records",
            error: error.message
        });
    }
};

// HOD finds available faculty ranked by workload
const findAvailableFaculty = async (req, res) => {
    try {
        const { substitutionId } = req.params;

        const substitution = await Substitution.findById(substitutionId);

        if (!substitution) {
            return res.status(404).json({
                message: "Substitution record not found"
            });
        }

        if (["accepted", "completed"].includes(substitution.status)) {
            return res.status(400).json({
                message: "This substitution is already assigned"
            });
        }

        const facultyMembers = await Faculty.find({
            department: substitution.department,
            subjects: substitution.subject,
            role: "faculty",
            _id: { $ne: substitution.absentFaculty }
        }).select("name email department subjects");

        const availableFaculty = [];

        const dayStart = new Date(substitution.date);
        dayStart.setUTCHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        for (const faculty of facultyMembers) {
            const busy = await Timetable.findOne({
                faculty: faculty._id,
                dayOfWeek: substitution.dayOfWeek,
                period: substitution.period
            });

            if (busy) continue;

            const alreadyAssigned = await Substitution.findOne({
                date: { $gte: dayStart, $lt: dayEnd },
                period: substitution.period,
                $or: [
                    { substituteFaculty: faculty._id },
                    { offeredTo: faculty._id }
                ],
                status: {
                    $in: ["offered", "accepted", "completed"]
                }
            });

            if (alreadyAssigned) continue;

            const workload = await Substitution.countDocuments({
                substituteFaculty: faculty._id,
                status: { $in: ["accepted", "completed"] }
            });

            availableFaculty.push({
                ...faculty.toObject(),
                workload
            });
        }

        availableFaculty.sort((a, b) => a.workload - b.workload);

        return res.status(200).json({
            message: "Available faculty ranked by workload successfully",
            count: availableFaculty.length,
            availableFaculty
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to find available faculty",
            error: error.message
        });
    }
};

// HOD sends substitution offer
const offerSubstitution = async (req, res) => {
    try {
        const { facultyId } = req.body;

        const substitution = await Substitution.findById(
            req.params.substitutionId
        );

        if (!substitution) {
            return res.status(404).json({
                message: "Substitution record not found"
            });
        }

        if (!facultyId) {
            return res.status(400).json({
                message: "Please select a faculty member"
            });
        }

        if (!["pending", "rejected"].includes(substitution.status)) {
            return res.status(400).json({
                message: "An offer cannot be sent for this substitution status"
            });
        }

        const faculty = await Faculty.findOne({
            _id: facultyId,
            department: substitution.department,
            subjects: substitution.subject,
            role: "faculty",
            _id: { $ne: substitution.absentFaculty }
        });

        if (!faculty) {
            return res.status(400).json({
                message: "Selected faculty is not eligible for this substitution"
            });
        }

        const dayStart = new Date(substitution.date);
        dayStart.setUTCHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        const busy = await Timetable.findOne({
            faculty: faculty._id,
            dayOfWeek: substitution.dayOfWeek,
            period: substitution.period
        });

        if (busy) {
            return res.status(409).json({
                message: "Selected faculty has a regular class during this period"
            });
        }

        const conflict = await Substitution.findOne({
            date: { $gte: dayStart, $lt: dayEnd },
            period: substitution.period,
            _id: { $ne: substitution._id },
            $or: [
                { offeredTo: faculty._id },
                { substituteFaculty: faculty._id }
            ],
            status: { $in: ["offered", "accepted", "completed"] }
        });

        if (conflict) {
            return res.status(409).json({
                message: "Selected faculty already has another substitution during this period"
            });
        }

        substitution.offeredTo = faculty._id;
        substitution.substituteFaculty = null;
        substitution.status = "offered";

        await substitution.save();

        return res.status(200).json({
            message: "Substitution offer sent successfully",
            substitution
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to send substitution offer",
            error: error.message
        });
    }
};

// Faculty accepts or rejects substitution offer
const respondToSubstitution = async (req, res) => {
    try {
        const { response } = req.body;

        if (!["accepted", "rejected"].includes(response)) {
            return res.status(400).json({
                message: "Response must be accepted or rejected"
            });
        }

        const substitution = await Substitution.findById(
            req.params.substitutionId
        );

        if (!substitution) {
            return res.status(404).json({
                message: "Substitution record not found"
            });
        }

        if (
            !substitution.offeredTo ||
            substitution.offeredTo.toString() !== req.faculty.id.toString()
        ) {
            return res.status(403).json({
                message: "You are not authorized to respond to this offer"
            });
        }

        if (substitution.status !== "offered") {
            return res.status(400).json({
                message: "This offer is no longer available"
            });
        }

        if (response === "accepted") {
            const dayStart = new Date(substitution.date);
            dayStart.setUTCHours(0, 0, 0, 0);

            const dayEnd = new Date(dayStart);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

            const conflict = await Substitution.findOne({
                _id: { $ne: substitution._id },
                date: { $gte: dayStart, $lt: dayEnd },
                period: substitution.period,
                $or: [
                    { offeredTo: req.faculty.id },
                    { substituteFaculty: req.faculty.id }
                ],
                status: { $in: ["offered", "accepted", "completed"] }
            });

            if (conflict) {
                return res.status(409).json({
                    message: "You already have another substitution during this period"
                });
            }

            substitution.status = "accepted";
            substitution.substituteFaculty = req.faculty.id;
        } else {
            substitution.status = "rejected";
            substitution.offeredTo = null;
            substitution.substituteFaculty = null;
        }

        await substitution.save();

        return res.status(200).json({
            message: response === "accepted"
                ? "Substitution accepted successfully"
                : "Substitution rejected successfully",
            substitution
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to respond to substitution",
            error: error.message
        });
    }
};

// Faculty views received offers
const getMyOffers = async (req, res) => {
    try {
        const offers = await Substitution.find({
            offeredTo: req.faculty.id,
            status: "offered"
        })
            .populate("absentFaculty", "name email department")
            .sort({ date: 1, period: 1 });

        return res.status(200).json({
            message: "Your substitution offers fetched successfully",
            count: offers.length,
            offers
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch substitution offers",
            error: error.message
        });
    }
};

// HOD views all substitution records
const getAllSubstitutions = async (req, res) => {
    try {
        const substitutions = await Substitution.find()
            .populate("absentFaculty", "name email department")
            .populate("offeredTo", "name email")
            .populate("substituteFaculty", "name email")
            .sort({ date: 1, period: 1 });

        return res.status(200).json({
            message: "Substitution records fetched successfully",
            count: substitutions.length,
            substitutions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch substitution records",
            error: error.message
        });
    }
};

module.exports = {
    generateSubstitutions,
    findAvailableFaculty,
    offerSubstitution,
    respondToSubstitution,
    getMyOffers,
    getAllSubstitutions
};
