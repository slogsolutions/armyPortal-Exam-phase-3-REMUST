const router = require("express").Router();
const ctrl = require("../controllers/practical.controller");

router.post("/submit", ctrl.submitPractical);
router.get("/:candidateId/:tradeId", ctrl.getPractical);

module.exports = router;
