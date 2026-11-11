
const jwt = require("jsonwebtoken");

// Verify JWT token
const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            req.faculty = decoded;

            next();

        } catch (error) {
            return res.status(401).json({
                message: "Not authorized, invalid token"
            });
        }

    } else {
        return res.status(401).json({
            message: "Not authorized, no token provided"
        });
    }
};

// Allow only HOD
const authorizeHOD = (req, res, next) => {

    if (req.faculty && req.faculty.role === "hod") {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Only HOD can perform this action."
        });
    }
};

module.exports = {
    protect,
    authorizeHOD
};
