const router = require("express").Router();
const ctrl = require("../controllers/admin.controller");

router.post("/rank", ctrl.addRank);
router.post("/trade", ctrl.addTrade);
router.post("/command", ctrl.addCommand);
router.post("/center", ctrl.addCenter);

module.exports = router;
