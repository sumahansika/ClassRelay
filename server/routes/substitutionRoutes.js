
const express = require("express");
const router = express.Router();

const {
    generateSubstitutions,
    findAvailableFaculty,
    offerSubstitution,
    respondToSubstitution,
    getMyOffers,
    getAllSubstitutions
} = require("../controllers/substitutionController");

const {
    protect,
    authorizeHOD
} = require("../middleware/authMiddleware");

// HOD generates substitution records
router.post(
    "/generate/:leaveId",
    protect,
    authorizeHOD,
    generateSubstitutions
);

// HOD views all substitution records
router.get(
    "/all",
    protect,
    authorizeHOD,
    getAllSubstitutions
);

// HOD finds available faculty
router.get(
    "/available/:substitutionId",
    protect,
    authorizeHOD,
    findAvailableFaculty
);

// HOD sends substitution offer
router.post(
    "/offer/:substitutionId",
    protect,
    authorizeHOD,
    offerSubstitution
);

// Faculty accepts or rejects offer
router.put(
    "/respond/:substitutionId",
    protect,
    respondToSubstitution
);

// Faculty views received substitution offers
router.get(
    "/my-offers",
    protect,
    getMyOffers
);

module.exports = router;
