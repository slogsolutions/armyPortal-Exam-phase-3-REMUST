const router = require("express").Router();
const ctrl = require("../controllers/practical.controller");

router.post("/submit", ctrl.submitPractical);
router.get("/candidates", ctrl.getAllCandidates);
router.get("/:candidateId", ctrl.getPractical);

module.exports = router;
