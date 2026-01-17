const router = require("express").Router();
const ctrl = require("../controllers/candidate.controller");

router.post("/register", ctrl.register);

/* Get candidate by ID */
router.get("/:candidateId", ctrl.getCandidateById);

/* Optional – for admin view */
router.get("/all", ctrl.getAllCandidates);

module.exports = router;
