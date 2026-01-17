const router = require("express").Router();
const ctrl = require("../controllers/admin.controller");
const adminAuth = require("../middlewares/adminAuth");

/* ===== ADD MASTER DATA (PROTECTED) ===== */
router.post("/rank", adminAuth, ctrl.addRank);
router.post("/trade", adminAuth, ctrl.addTrade);
router.post("/command", adminAuth, ctrl.addCommand);
router.post("/center", adminAuth, ctrl.addCenter);

/* ===== GET DROPDOWN DATA (PROTECTED) ===== */
router.get("/masters", adminAuth, ctrl.getMasters);

module.exports = router;
