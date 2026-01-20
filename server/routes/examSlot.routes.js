const router = require("express").Router();
const ctrl = require("../controllers/examSlot.controller");
const adminAuth = require("../middlewares/adminAuth");

// Admin routes (protected)
router.post("/", adminAuth, ctrl.createExamSlot);
router.get("/", adminAuth, ctrl.getExamSlots);
router.put("/:id", adminAuth, ctrl.updateExamSlot);
router.delete("/:id", adminAuth, ctrl.deleteExamSlot);
router.get("/:id", adminAuth, ctrl.getSlotDetails);

// Candidate routes
router.get("/candidate/:candidateId", ctrl.getAvailableSlots);
router.post("/assign", ctrl.assignToSlot);

module.exports = router;
