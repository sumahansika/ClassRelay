
const Leave = require("../models/Leave");
const generateSubstitutionRecords = require("../services/substitutionService");

// Check whether the faculty already has an overlapping leave
const findOverlappingLeave = async (facultyId, startDate, endDate, excludeId = null) => {
    const query = {
        faculty: facultyId,
        status: { $in: ["pending", "approved"] },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
    };

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    return await Leave.findOne(query);
};

// Faculty applies for leave
const applyLeave = async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;

        if (!startDate || !endDate || !reason) {
            return res.status(400).json({
                message: "Please provide all leave details"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                message: "Please provide valid dates"
            });
        }

        if (start > end) {
            return res.status(400).json({
                message: "End date cannot be before start date"
            });
        }

        const existingLeave = await findOverlappingLeave(
            req.faculty.id,
            start,
            end
        );

        if (existingLeave) {
            return res.status(409).json({
                message: "You already have a pending or approved leave request for overlapping dates."
            });
        }

        const leave = await Leave.create({
            faculty: req.faculty.id,
            startDate: start,
            endDate: end,
            reason
        });

        res.status(201).json({
            message: "Leave request submitted successfully",
            leave
        });

    } catch (error) {
        res.status(500).json({
            message: "Leave application failed",
            error: error.message
        });
    }
};

// HOD views pending leave requests
const getPendingLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ status: "pending" })
            .populate("faculty", "name email department subjects")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Pending leave requests fetched successfully",
            count: leaves.length,
            leaves
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch pending leave requests",
            error: error.message
        });
    }
};

// HOD approves or rejects leave
const reviewLeave = async (req, res) => {
    try {
        const { status } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({
                message: "Status must be approved or rejected"
            });
        }

        const leave = await Leave.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({
                message: "Leave request not found"
            });
        }

        if (leave.status !== "pending") {
            return res.status(400).json({
                message: "This leave request has already been reviewed"
            });
        }

        if (status === "approved") {
            const existingLeave = await findOverlappingLeave(
                leave.faculty,
                leave.startDate,
                leave.endDate,
                leave._id
            );

            if (existingLeave) {
                return res.status(409).json({
                    message: "Another pending or approved leave already exists for overlapping dates. This request cannot be approved."
                });
            }
        }

        leave.status = status;
        leave.reviewedBy = req.faculty.id;

        await leave.save();

        let substitutionResult = null;

        if (status === "approved") {
            substitutionResult = await generateSubstitutionRecords(leave);
        }

        res.status(200).json({
            message: status === "approved"
                ? "Leave approved and substitutions generated successfully"
                : "Leave request rejected successfully",
            leave,
            substitutionResult
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to review leave request",
            error: error.message
        });
    }
};

module.exports = {
    applyLeave,
    getPendingLeaves,
    reviewLeave
};
