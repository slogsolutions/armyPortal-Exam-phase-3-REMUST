const router = require("express").Router();
const ctrl = require("../controllers/candidate.controller");
const isAuth = require("../middlewares/isAuth");

/* ===== CANDIDATE LOGIN (PUBLIC) ===== */
router.post("/peek", ctrl.peek);
router.post("/login", ctrl.login);

/* ===== CANDIDATE REGISTRATION (PUBLIC) ===== */
router.post("/register", ctrl.register);

/* ===== GET CANDIDATE DATA (CANDIDATE ONLY) ===== */
router.get("/:candidateId", isAuth(["CANDIDATE"]), ctrl.getCandidateById);

/* ===== GET ALL CANDIDATES (ADMIN ONLY) ===== */
router.get("/", isAuth(["ADMIN"]), ctrl.getAllCandidates);

module.exports = router;
