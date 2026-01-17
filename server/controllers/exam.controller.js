const prisma = require("../config/prisma");
const XLSX = require("xlsx");

/**
 * Get exam paper for candidate (only mapped trade allowed)
 */
exports.getPaper = async (req, res) => {
  try {
    const { tradeId, paperType } = req.params;

    const paper = await prisma.examPaper.findFirst({
      where: { 
        tradeId: Number(tradeId), 
        paperType,
        isActive: true
      },
      include: { 
        questions: {
          orderBy: { questionOrder: 'asc' }
        },
        trade: true
      }
    });

    if (!paper) {
      return res.json({ status: "NA", message: "Paper not uploaded" });
    }

    res.json(paper);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get available papers for a candidate (only WP-I and WP-II)
 */
exports.getAvailablePapers = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: { trade: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Parse selected exam types from JSON string
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // Only get WP-I and WP-II papers
    const papers = await prisma.examPaper.findMany({
      where: { 
        tradeId: candidate.tradeId,
        paperType: { in: ["WP-I", "WP-II"] },
        isActive: true
      },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    // Filter papers to only include those selected by candidate
    const availablePapers = papers.filter(p => selectedTypes.includes(p.paperType));

    res.json(availablePapers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Start exam
 */
exports.startExam = async (req, res) => {
  try {
    const { candidateId, examPaperId } = req.body;

    // Check if attempt already exists
    let attempt = await prisma.examAttempt.findFirst({
      where: {
        candidateId: Number(candidateId),
        examPaperId: Number(examPaperId),
        status: { in: ["PENDING", "IN_PROGRESS"] }
      }
    });

    if (attempt) {
      return res.json(attempt);
    }

    const paper = await prisma.examPaper.findUnique({
      where: { id: Number(examPaperId) },
      include: { questions: true }
    });

    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }

    attempt = await prisma.examAttempt.create({
      data: {
        candidateId: Number(candidateId),
        examPaperId: Number(examPaperId),
        score: 0,
        totalMarks: paper.questions.reduce((sum, q) => sum + q.marks, 0),
        percentage: 0,
        status: "IN_PROGRESS",
        startedAt: new Date()
      }
    });

    res.json(attempt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Submit exam & evaluate
 */
exports.submitExam = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: Number(attemptId) },
      include: {
        examPaper: {
          include: {
            trade: true,
            questions: true
          }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({ error: "Exam attempt not found" });
    }

    if (attempt.status === "COMPLETED") {
      return res.json({ 
        score: attempt.score, 
        percentage: attempt.percentage, 
        status: attempt.status 
      });
    }

    const negativeMarking = attempt.examPaper.trade.negativeMarking || 0;
    let score = 0;
    const answerRecords = [];

    // Evaluate each answer
    for (let ans of answers) {
      const question = attempt.examPaper.questions.find(
        q => q.id === ans.questionId
      );

      if (!question) continue;

      const isCorrect = question.correctAnswer.toUpperCase() === ans.selectedAnswer.toUpperCase();
      let marksObtained = 0;

      if (isCorrect) {
        marksObtained = question.marks;
        score += question.marks;
      } else if (ans.selectedAnswer && ans.selectedAnswer.trim() !== "") {
        // Wrong answer - apply negative marking
        score -= negativeMarking;
        marksObtained = -negativeMarking;
      }

      answerRecords.push({
        examAttemptId: attempt.id,
        questionId: question.id,
        selectedAnswer: ans.selectedAnswer || "",
        isCorrect,
        marksObtained
      });
    }

    // Create answer records
    await prisma.answer.createMany({
      data: answerRecords
    });

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    const totalMarks = attempt.totalMarks || attempt.examPaper.questions.reduce(
      (sum, q) => sum + q.marks,
      0
    );

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const status = percentage >= attempt.examPaper.trade.minPercent ? "PASS" : "FAIL";

    // Update attempt
    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score,
        totalMarks,
        percentage,
        status: "COMPLETED",
        submittedAt: new Date()
      }
    });

    res.json({ 
      score, 
      totalMarks,
      percentage: parseFloat(percentage.toFixed(2)), 
      status,
      attemptId: updatedAttempt.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Upload single question to paper
 */
exports.uploadPaper = async (req, res) => {
  try {
    const { tradeId, paperType, questionText, optionA, optionB, optionC, optionD, correctAnswer, marks } = req.body;

    // Find or create exam paper
    let paper = await prisma.examPaper.findFirst({
      where: { tradeId: Number(tradeId), paperType }
    });

    if (!paper) {
      paper = await prisma.examPaper.create({
        data: {
          tradeId: Number(tradeId),
          paperType,
          isActive: true
        }
      });
    }

    // Get current question count for ordering
    const questionCount = await prisma.question.count({
      where: { examPaperId: paper.id }
    });

    // Create question
    const question = await prisma.question.create({
      data: {
        examPaperId: paper.id,
        questionText,
        optionA: optionA || null,
        optionB: optionB || null,
        optionC: optionC || null,
        optionD: optionD || null,
        correctAnswer: correctAnswer.toUpperCase(),
        marks: parseFloat(marks) || 1.0,
        questionOrder: questionCount + 1
      }
    });

    res.json({ success: true, question, paper });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Bulk upload papers from Excel
 */
exports.bulkUploadPapers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = [];
    const errors = [];

    for (let row of data) {
      try {
        // Expected columns: Trade, PaperType, Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks
        const tradeName = row.Trade || row.trade;
        const paperType = row.PaperType || row.paperType || row['Paper Type'];
        const questionText = row.Question || row.question;
        const optionA = row.OptionA || row.optionA || row['Option A'];
        const optionB = row.OptionB || row.optionB || row['Option B'];
        const optionC = row.OptionC || row.optionC || row['Option C'];
        const optionD = row.OptionD || row.optionD || row['Option D'];
        const correctAnswer = (row.CorrectAnswer || row.correctAnswer || row['Correct Answer'] || '').toString().toUpperCase();
        const marks = parseFloat(row.Marks || row.marks || 1.0);

        if (!tradeName || !paperType || !questionText) {
          errors.push({ row, error: "Missing required fields" });
          continue;
        }

        // Find trade
        const trade = await prisma.trade.findFirst({
          where: { name: { contains: tradeName, mode: 'insensitive' } }
        });

        if (!trade) {
          errors.push({ row, error: `Trade not found: ${tradeName}` });
          continue;
        }

        // Find or create paper
        let paper = await prisma.examPaper.findFirst({
          where: { tradeId: trade.id, paperType }
        });

        if (!paper) {
          paper = await prisma.examPaper.create({
            data: {
              tradeId: trade.id,
              paperType,
              isActive: true
            }
          });
        }

        // Get question count
        const questionCount = await prisma.question.count({
          where: { examPaperId: paper.id }
        });

        // Create question
        const question = await prisma.question.create({
          data: {
            examPaperId: paper.id,
            questionText,
            optionA: optionA || null,
            optionB: optionB || null,
            optionC: optionC || null,
            optionD: optionD || null,
            correctAnswer,
            marks,
            questionOrder: questionCount + 1
          }
        });

        results.push({ trade: tradeName, paperType, questionId: question.id });
      } catch (err) {
        errors.push({ row, error: err.message });
      }
    }

    res.json({
      success: true,
      uploaded: results.length,
      errors: errors.length,
      results,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
