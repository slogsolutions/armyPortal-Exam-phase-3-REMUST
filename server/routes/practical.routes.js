const router = require("express").Router();
const ctrl = require("../controllers/practical.controller");
const adminAuth = require("../middlewares/adminAuth");

// Submit practical marks (protected)
router.post("/submit", adminAuth, ctrl.submitPractical);

// Bulk submit practical marks (protected)
router.post("/bulk-submit", adminAuth, ctrl.bulkSubmitPractical);

// Get practical marks for candidate
router.get("/candidate/:candidateId", ctrl.getPractical);

// Get all candidates with practical marks (protected)
router.get("/candidates", adminAuth, ctrl.getAllCandidates);

// Get practical marks summary (protected)
router.get("/summary", adminAuth, ctrl.getPracticalSummary);

module.exports = router;
