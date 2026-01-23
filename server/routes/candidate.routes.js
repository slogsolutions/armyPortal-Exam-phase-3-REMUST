const router = require("express").Router();
const ctrl = require("../controllers/candidate.controller");
const isAuth = require("../middlewares/isAuth");

/* ===== CANDIDATE LOGIN (PUBLIC) ===== */
router.post("/peek", ctrl.peek);
router.post("/login", ctrl.login);

/* ===== CANDIDATE REGISTRATION (PUBLIC) ===== */
router.post("/register", ctrl.register);

/* ===== CANDIDATE EXAM REASSIGNMENT (ADMIN ONLY) ===== */
router.post(
  "/:candidateId/reassign-exam",
  isAuth(["ADMIN"]),
  ctrl.reassignExamAttempt
);

/* ===== GET CANDIDATE DATA (CANDIDATE OR ADMIN) ===== */
router.get("/:candidateId", isAuth(["CANDIDATE", "ADMIN"]), ctrl.getCandidateById);

/* ===== UPDATE / DELETE CANDIDATE (ADMIN ONLY) ===== */
router.put("/:candidateId", isAuth(["ADMIN"]), ctrl.updateCandidate);
router.delete("/:candidateId", isAuth(["ADMIN"]), ctrl.deleteCandidate);

/* ===== GET ALL CANDIDATES (ADMIN ONLY) ===== */
router.get("/", isAuth(["ADMIN"]), ctrl.getAllCandidates);

/* ===== BULK SLOT ASSIGNMENT (ADMIN ONLY) ===== */
router.post("/bulk-assign-slots", isAuth(["ADMIN"]), ctrl.assignAllUnassignedCandidates);

module.exports = router;
