const router = require("express").Router();
const multer = require("multer");
const ctrl = require("../controllers/exam.controller");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/upload-paper", ctrl.uploadPaper);
router.post("/bulk-upload", upload.single("file"), ctrl.bulkUploadPapers);
router.get("/debug/question-counts", ctrl.debugQuestionCounts);
router.get("/test-slots", async (req, res) => {
  try {
    console.log("🔍 TEST-SLOTS: Starting test endpoint");
    const { attachQuestionCounts } = require("../utils/questionCounts");
    const prisma = require("../config/prisma");
    
    console.log("🔍 TEST-SLOTS: Fetching raw slots");
    const examSlotsRaw = await prisma.examSlot.findMany({
      include: {
        trade: true,
        command: true,
        center: true,
        _count: {
          select: { 
            candidates: true,
            examAttempts: true 
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`🔍 TEST-SLOTS: Found ${examSlotsRaw.length} raw slots`);
    
    console.log("🔍 TEST-SLOTS: Calling attachQuestionCounts");
    const examSlots = await attachQuestionCounts(examSlotsRaw, prisma);
    
    console.log(`🔍 TEST-SLOTS: Returning ${examSlots.length} enriched slots`);
    examSlots.forEach(slot => {
      console.log(`🔍 TEST-SLOTS: Slot ${slot.id} -> ${slot.questionCount} questions`);
    });
    
    res.json(examSlots);
  } catch (error) {
    console.error("❌ TEST-SLOTS: Error:", error);
    res.status(500).json({ error: error.message });
  }
});
router.get("/paper/:tradeId/:paperType", ctrl.getPaper);
router.get("/available/:candidateId", ctrl.getAvailablePapers);
router.post("/start", ctrl.startExam);
router.post("/submit", ctrl.submitExam);

module.exports = router;
