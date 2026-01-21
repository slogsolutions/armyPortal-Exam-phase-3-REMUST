const router = require("express").Router();
const ctrl = require("../controllers/admin.controller");
const candidateCtrl = require("../controllers/candidate.controller");
const authCtrl = require("../controllers/auth.controller");
const isAuth = require("../middlewares/isAuth");

/* ===== ADMIN LOGIN (PUBLIC) ===== */
router.post("/login", authCtrl.login);

/* ===== CANDIDATE REGISTRATION (ADMIN ONLY) ===== */
router.post("/register-candidate", isAuth(["ADMIN"]), candidateCtrl.register);

/* ===== ADD MASTER DATA (ADMIN ONLY) ===== */
router.post("/rank", isAuth(["ADMIN"]), ctrl.addRank);
router.post("/trade", isAuth(["ADMIN"]), ctrl.addTrade);
router.post("/command", isAuth(["ADMIN"]), ctrl.addCommand);
// Center routes removed - using Commands only

/* ===== UPDATE MASTER DATA (ADMIN ONLY) ===== */
router.put("/trade/:id", isAuth(["ADMIN"]), ctrl.updateTrade);
router.put("/command/:id", isAuth(["ADMIN"]), ctrl.updateCommand);
// Center update route removed - using Commands only

/* ===== DELETE MASTER DATA (ADMIN ONLY) ===== */
router.delete("/trade/:id", isAuth(["ADMIN"]), ctrl.deleteTrade);
router.delete("/command/:id", isAuth(["ADMIN"]), ctrl.deleteCommand);
// Center delete route removed - using Commands only

/* ===== GET DROPDOWN DATA (PUBLIC) ===== */
router.get("/masters", ctrl.getMasters);
router.get("/trades", ctrl.getTrades);
router.get("/centers", ctrl.getCenters);

/* ===== BULK OPERATIONS (ADMIN ONLY) ===== */
router.post("/trades/bulk", isAuth(["ADMIN"]), ctrl.bulkConfigureTrades);

module.exports = router;
