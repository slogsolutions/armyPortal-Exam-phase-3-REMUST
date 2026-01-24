const router = require("express").Router();
const multer = require("multer");
const ctrl = require("../controllers/exam.controller");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/upload-paper", ctrl.uploadPaper);
router.post("/bulk-upload", upload.single("file"), ctrl.bulkUploadPapers);
router.get("/debug/question-counts", ctrl.debugQuestionCounts);
router.get("/paper/:tradeId/:paperType", ctrl.getPaper);
router.get("/available/:candidateId", ctrl.getAvailablePapers);
router.post("/start", ctrl.startExam);
router.post("/submit", ctrl.submitExam);

module.exports = router;
