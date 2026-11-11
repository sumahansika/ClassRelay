const Faculty = require("../models/Faculty");

const getMyProfile = async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.faculty.id)
            .select("-password");

        if (!faculty) {
            return res.status(404).json({
                message: "Faculty not found"
            });
        }

        res.status(200).json({
            message: "Faculty profile fetched successfully",
            faculty
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch profile",
            error: error.message
        });
    }
};

module.exports = { getMyProfile };