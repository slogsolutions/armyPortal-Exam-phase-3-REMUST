const router = require("express").Router();
const ctrl = require("../controllers/exam.controller");

router.post("/upload-paper", ctrl.uploadPaper);   // Excel later
router.get("/paper/:tradeId/:paperType", ctrl.getPaper);
router.post("/start", ctrl.startExam);
router.post("/submit", ctrl.submitExam);

module.exports = router;
