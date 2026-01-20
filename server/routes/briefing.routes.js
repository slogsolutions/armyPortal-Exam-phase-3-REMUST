const router = require("express").Router();
const ctrl = require("../controllers/briefing.controller");

// Get candidate briefing information
router.get("/candidate/:candidateId", ctrl.getCandidateBriefing);

// Get exam instructions for specific paper type
router.get("/instructions/:candidateId/:paperType", ctrl.getExamInstructions);

// Check if candidate can start exam
router.get("/can-start/:candidateId/:paperType", ctrl.canStartExam);

module.exports = router;
