const prisma = require("../config/prisma");
const XLSX = require("xlsx");
const { WRITTEN_SEQUENCE } = require("../utils/examFlow");
const fs = require("fs");
const crypto = require("crypto");

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
      include: { trade: true, command: true, center: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Parse selected exam types from JSON string
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // CRITICAL: Check if candidate has valid slot assignments for their selected exam types
    const now = new Date();
    const availableSlots = await prisma.examSlot.findMany({
      where: {
        tradeId: candidate.tradeId,
        commandId: candidate.commandId,
        centerId: candidate.centerId || undefined,
        paperType: { in: selectedTypes },
        isActive: true,
        startTime: { lte: now }, // Slot has started
        endTime: { gte: now },   // Slot hasn't ended
        candidates: {
          some: { id: candidate.id } // Candidate is assigned to this slot
        }
      }
    });

    if (availableSlots.length === 0) {
      console.log('❌ No active slots for candidate:', {
        candidateId: candidate.id,
        armyNo: candidate.armyNo,
        trade: candidate.trade?.name,
        command: candidate.command?.name,
        center: candidate.center?.name,
        selectedTypes
      });
      
      return res.status(403).json({ 
        error: "No active exam slots found for your trade and command/center. Please contact the exam cell.",
        details: {
          trade: candidate.trade?.name,
          command: candidate.command?.name,
          center: candidate.center?.name,
          selectedExamTypes: selectedTypes
        }
      });
    }

    // Only get papers for which the candidate has active slots
    const availablePaperTypes = availableSlots.map(slot => slot.paperType);
    
    const papers = await prisma.examPaper.findMany({
      where: { 
        tradeId: candidate.tradeId,
        paperType: { in: availablePaperTypes },
        isActive: true
      },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    console.log('📋 Available papers for candidate:', {
      candidateId: candidate.id,
      armyNo: candidate.armyNo,
      trade: candidate.trade?.name,
      availableSlots: availableSlots.length,
      availablePapers: papers.length,
      paperTypes: papers.map(p => p.paperType)
    });

    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Start exam with slot validation
 */
exports.startExam = async (req, res) => {
  try {
    const { candidateId, paperType, examSlotId, examPaperId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ error: "candidateId is required" });
    }

    // Validate candidate and load trade/command/center
    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: { trade: true, command: true, center: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Determine paper type
    let resolvedPaperType = paperType || null;

    let paper = null;
    if (examPaperId) {
      paper = await prisma.examPaper.findUnique({
        where: { id: Number(examPaperId) },
        include: { questions: true }
      });

      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }

      resolvedPaperType = resolvedPaperType || paper.paperType;

      if (paper.tradeId !== candidate.tradeId) {
        return res.status(403).json({ error: "Paper does not belong to candidate trade" });
      }
    }

    if (!resolvedPaperType) {
      return res.status(400).json({ error: "paperType is required" });
    }

    // Ensure candidate registered for this paper type (if registration exists)
    const selectedTypes = candidate.selectedExamTypes
      ? JSON.parse(candidate.selectedExamTypes)
      : [];

    if (selectedTypes.length && !selectedTypes.includes(resolvedPaperType)) {
      return res.status(403).json({ error: "Candidate is not registered for this paper type" });
    }

    // Ensure written sequence order (WP-I before WP-II, etc.)
    if (WRITTEN_SEQUENCE.includes(resolvedPaperType)) {
      const completedWritten = await prisma.examAttempt.findMany({
        where: {
          candidateId: Number(candidateId),
          status: "COMPLETED",
          examPaper: {
            paperType: { in: WRITTEN_SEQUENCE }
          }
        },
        include: { examPaper: true }
      });

      const completedTypes = completedWritten.map((attempt) => attempt.examPaper.paperType);
      const alreadyCompleted = completedTypes.includes(resolvedPaperType);
      if (alreadyCompleted) {
        return res.status(403).json({
          error: `${resolvedPaperType} already completed`,
          completed: true
        });
      }

      const nextRequired = WRITTEN_SEQUENCE.find((type) => !completedTypes.includes(type));

      if (nextRequired && resolvedPaperType !== nextRequired) {
        return res.status(403).json({
          error: `You must complete ${nextRequired} before attempting ${resolvedPaperType}`,
          nextRequired
        });
      }
    }

    // Resolve paper if not provided via ID
    if (!paper) {
      paper = await prisma.examPaper.findFirst({
        where: {
          tradeId: candidate.tradeId,
          paperType: resolvedPaperType,
          isActive: true
        },
        include: { questions: true }
      });

      if (!paper) {
        return res.status(404).json({ error: "No question bank uploaded for this trade and paper type" });
      }
    }

    let slot = null;
    const now = new Date();

    if (examSlotId) {
      slot = await prisma.examSlot.findUnique({
        where: { id: Number(examSlotId) }
      });

      if (!slot) {
        return res.status(404).json({ error: "Exam slot not found" });
      }

      if (!slot.isActive) {
        return res.status(400).json({ error: "Exam slot is inactive" });
      }

      if (slot.tradeId !== candidate.tradeId || slot.paperType !== resolvedPaperType) {
        return res.status(403).json({ error: "Exam slot does not match candidate trade or paper" });
      }

      if (now < new Date(slot.startTime)) {
        return res.status(400).json({ error: "Exam slot has not started yet" });
      }
      if (now > new Date(slot.endTime)) {
        return res.status(400).json({ error: "Exam slot has ended" });
      }

      if (candidate.commandId && slot.commandId !== candidate.commandId) {
        return res.status(403).json({ error: "Exam slot command does not match candidate command" });
      }

      if (candidate.centerId && slot.centerId !== candidate.centerId) {
        return res.status(403).json({ error: "Exam slot center does not match candidate center" });
      }

      // Auto-attach candidate to slot if not already assigned
      const alreadyAssigned = await prisma.examSlot.findFirst({
        where: {
          id: slot.id,
          candidates: {
            some: { id: candidate.id }
          }
        }
      });

      if (!alreadyAssigned) {
        await prisma.examSlot.update({
          where: { id: slot.id },
          data: {
            candidates: {
              connect: { id: candidate.id }
            }
          }
        });
      }
    }

    // Check if attempt already exists for this paper (and slot, if provided)
    let attempt = await prisma.examAttempt.findFirst({
      where: {
        candidateId: Number(candidateId),
        examPaperId: paper.id,
        ...(slot ? { examSlotId: slot.id } : {}),
        status: { in: ["PENDING", "IN_PROGRESS"] }
      }
    });

    if (attempt) {
      return res.json(attempt);
    }

    // Create new attempt
    attempt = await prisma.examAttempt.create({
      data: {
        candidateId: Number(candidateId),
        examPaperId: paper.id,
        examSlotId: slot ? slot.id : null,
        score: 0,
        totalMarks: paper.questions.reduce((sum, q) => sum + q.marks, 0),
        percentage: 0,
        status: "IN_PROGRESS",
        startedAt: now
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

    // Refresh answer records for this attempt
    await prisma.answer.deleteMany({ where: { examAttemptId: attempt.id } });

    if (answerRecords.length > 0) {
      await prisma.answer.createMany({
        data: answerRecords
      });
    }

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
      attemptId: updatedAttempt.id,
      answers: answerRecords,
      submittedAt: updatedAttempt.submittedAt
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
    console.log("📝 Single upload payload:", req.body);
    const { tradeId, paperType, questionText, optionA, optionB, optionC, optionD, correctAnswer, marks } = req.body;

    // Find or create exam paper
    let paper = await prisma.examPaper.findFirst({
      where: { tradeId: Number(tradeId), paperType }
    });

    if (!paper) {
      console.log("📄 No existing paper found. Creating new exam paper", { tradeId, paperType });
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

    console.log("🆕 Created question", { questionId: question.id, paperId: paper.id, order: question.questionOrder });
    res.json({ success: true, question, paper });
  } catch (error) {
    console.error("❌ Single upload failed:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Enhanced bulk upload with support for Excel, CSV, and encrypted .dat files
 */
exports.bulkUploadPapers = async (req, res) => {
  try {
    console.log('📁 Bulk upload attempt:', { 
      file: req.file?.originalname, 
      fileType: req.body.fileType,
      hasPassword: !!req.body.password 
    });
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { password, fileType } = req.body;
    let data = [];

    // Handle different file types
    if (fileType === 'dat' && req.file.originalname.endsWith('.dat')) {
      // Handle encrypted .dat file
      if (!password) {
        return res.status(400).json({ error: "Password required for encrypted .dat files" });
      }
      
      try {
        console.log('🔐 Attempting to decrypt .dat file...');
        const decryptedBuffer = decryptDatFile(req.file.buffer, password);
        console.log('✅ Decryption successful, parsing Excel...');
        
        // Parse the decrypted Excel file
        const workbook = XLSX.read(decryptedBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
        console.log('✅ Excel parsed successfully, items:', data.length);
      } catch (decryptError) {
        console.error('💥 Decryption error:', decryptError.message);
        return res.status(400).json({ 
          error: "Invalid password or corrupted .dat file",
          details: decryptError.message 
        });
      }
    } else if (req.file.originalname.endsWith('.csv')) {
      // Handle CSV file
      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          data.push(row);
        }
      }
    } else {
      // Handle Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    const results = [];
    const errors = [];
    const attemptStats = new Map();

    // Cache trades to support case-insensitive matching without Prisma mode option
    const tradeRecords = await prisma.trade.findMany({
      select: {
        id: true,
        name: true,
        wp1: true,
        wp2: true,
        wp3: true,
        pr1: true,
        pr2: true,
        pr3: true,
        pr4: true,
        pr5: true,
        oral: true
      }
    });

    const sanitize = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");

    const digitsToRoman = (value = "") => value.toString().replace(/1/g, "I").replace(/2/g, "II").replace(/3/g, "III").replace(/4/g, "IV").replace(/5/g, "V");
    const romanToDigits = (value = "") => {
      let result = value.toString();
      const replacements = [
        ["III", "3"],
        ["II", "2"],
        ["IV", "4"],
        ["V", "5"],
        ["I", "1"]
      ];
      replacements.forEach(([roman, digit]) => {
        result = result.replace(new RegExp(roman, "gi"), digit);
      });
      return result;
    };

    const tradeByExactName = new Map();
    const tradeByLowerName = new Map();
    const tradeBySanitized = new Map();
    for (const trade of tradeRecords) {
      tradeByExactName.set(trade.name, trade);
      tradeByLowerName.set(trade.name.toLowerCase(), trade);
      const sanitizedName = sanitize(trade.name);
      tradeBySanitized.set(sanitizedName, trade);

      const romanVariant = digitsToRoman(trade.name);
      const digitVariant = romanToDigits(trade.name);

      const sanitizedRomanVariant = sanitize(romanVariant);
      const sanitizedDigitVariant = sanitize(digitVariant);

      if (!tradeBySanitized.has(sanitizedRomanVariant)) {
        tradeBySanitized.set(sanitizedRomanVariant, trade);
      }
      if (!tradeBySanitized.has(sanitizedDigitVariant)) {
        tradeBySanitized.set(sanitizedDigitVariant, trade);
      }
    }

    const getSummaryEntry = (tradeNameKey, displayName, paperType) => {
      const key = `${tradeNameKey}|${paperType}`;
      if (!attemptStats.has(key)) {
        attemptStats.set(key, {
          tradeName: displayName || "UNKNOWN",
          paperType,
          attempted: 0,
          created: 0,
          errors: 0
        });
      }
      return attemptStats.get(key);
    };

    for (let row of data) {
      try {
        // Expected columns: Trade, PaperType, Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks
        const tradeName = row.Trade || row.trade;
        const paperType = normalizePaperType(row.PaperType || row.paperType || row['Paper Type']);
        const questionText = row.Question || row.question;
        const optionA = row.OptionA || row.optionA || row['Option A'];
        const optionB = row.OptionB || row.optionB || row['Option B'];
        const optionC = row.OptionC || row.optionC || row['Option C'];
        const optionD = row.OptionD || row.optionD || row['Option D'];
        const correctAnswer = (row.CorrectAnswer || row.correctAnswer || row['Correct Answer'] || '').toString().toUpperCase();
        const marks = parseFloat(row.Marks || row.marks || 1.0);

        const normalizedTradeName = (tradeName || "").trim();
        const summaryEntry = getSummaryEntry(sanitize(normalizedTradeName), normalizedTradeName || tradeName, paperType);
        summaryEntry.attempted += 1;

        if (!tradeName || !paperType || !questionText) {
          errors.push({ row, error: "Missing required fields (Trade, PaperType, Question)" });
          summaryEntry.errors += 1;
          continue;
        }

        // Validate paper type
        const validPaperTypes = ["WP-I", "WP-II", "WP-III", "PR-I", "PR-II", "PR-III", "PR-IV", "PR-V", "ORAL"];
        if (!validPaperTypes.includes(paperType)) {
          errors.push({ row, error: `Invalid paper type: ${paperType}. Valid types: ${validPaperTypes.join(', ')}` });
          summaryEntry.errors += 1;
          continue;
        }

        const tradeLower = normalizedTradeName.toLowerCase();
        const normalizedRoman = digitsToRoman(normalizedTradeName);
        const normalizedDigits = romanToDigits(normalizedTradeName);

        // Find trade from cached list (case-insensitive)
        let trade = normalizedTradeName
          ? tradeByExactName.get(normalizedTradeName)
              || tradeByLowerName.get(tradeLower)
              || tradeBySanitized.get(sanitize(normalizedTradeName))
              || tradeBySanitized.get(sanitize(normalizedRoman))
              || tradeBySanitized.get(sanitize(normalizedDigits))
          : null;

        if (!trade && normalizedTradeName) {
          trade = tradeRecords.find((record) => {
            const recordLower = record.name.toLowerCase();
            const recordSanitized = sanitize(record.name);
            const recordRomanSanitized = sanitize(digitsToRoman(record.name));
            const recordDigitSanitized = sanitize(romanToDigits(record.name));
            const normalizedSanitized = sanitize(normalizedTradeName);
            const normalizedRomanSanitized = sanitize(normalizedRoman);
            const normalizedDigitSanitized = sanitize(normalizedDigits);
            return (
              recordLower.includes(tradeLower)
              || recordSanitized.includes(normalizedSanitized)
              || recordRomanSanitized.includes(normalizedRomanSanitized)
              || recordDigitSanitized.includes(normalizedDigitSanitized)
            );
          }) || null;
        }

        console.log("🔍 Row lookup", {
          tradeName,
          matchedTradeId: trade?.id,
          paperType,
          marks,
          hasQuestion: Boolean(questionText)
        });

        if (!trade) {
          errors.push({ row, error: `Trade not found: ${tradeName}` });
          summaryEntry.errors += 1;
          continue;
        }

        // Update summary entry with canonical trade name if available
        summaryEntry.tradeName = trade.name;

        // Check if paper type is enabled for this trade
        const paperTypeMap = {
          'WP-I': 'wp1',
          'WP-II': 'wp2', 
          'WP-III': 'wp3',
          'PR-I': 'pr1',
          'PR-II': 'pr2',
          'PR-III': 'pr3',
          'PR-IV': 'pr4',
          'PR-V': 'pr5',
          'ORAL': 'oral'
        };

        const tradeField = paperTypeMap[paperType];
        if (tradeField) {
          const fieldEnabled = Boolean(trade[tradeField]);
          console.log("📑 Trade paper toggle", { tradeId: trade.id, tradeName: trade.name, paperType, tradeField, fieldEnabled });
          if (!fieldEnabled) {
            errors.push({ row, error: `${paperType} is not enabled for trade ${trade.name}` });
            summaryEntry.errors += 1;
            continue;
          }
        }

        // Find or create paper (only for written exams)
        let paper = null;
        if (paperType.startsWith('WP')) {
          paper = await prisma.examPaper.findFirst({
            where: { tradeId: trade.id, paperType }
          });

          if (!paper) {
            console.log("📄 Creating exam paper during bulk upload", { tradeId: trade.id, paperType });
            paper = await prisma.examPaper.create({
              data: {
                tradeId: trade.id,
                paperType,
                isActive: true
              }
            });
          }
        }

        // For practical and oral exams, we don't create papers, just validate
        if (!paper && !paperType.startsWith('WP')) {
          results.push({ trade: tradeName, paperType, message: "Validated practical/oral exam type" });
          summaryEntry.created += 1;
          continue;
        }

        // Check for duplicates by normalized question text within the same paper
        const normalizedQuestion = questionText.trim().toLowerCase();
        const existingQuestion = await prisma.question.findFirst({
          where: {
            examPaperId: paper.id,
            questionText: questionText
          }
        });

        if (existingQuestion) {
          summaryEntry.errors += 1;
          errors.push({ row, error: "Duplicate question detected. Skipped." });
          continue;
        }

        // Get question count for ordering
        const questionCount = await prisma.question.count({
          where: { examPaperId: paper.id }
        });

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

        console.log("✅ Created question", {
          tradeId: trade.id,
          paperType,
          questionId: question.id,
          order: question.questionOrder
        });
        results.push({ trade: tradeName, paperType, questionId: question.id });
        summaryEntry.created += 1;
      } catch (err) {
        console.error("❌ Row processing failed", { row, error: err.message });
        errors.push({ row, error: err.message });
        const tradeName = row.Trade || row.trade || "UNKNOWN";
        const paperType = normalizePaperType(row.PaperType || row.paperType || row['Paper Type']);
        const normalizedTradeName = (tradeName || "").trim();
        const summaryEntry = getSummaryEntry(sanitize(normalizedTradeName), normalizedTradeName || tradeName, paperType);
        summaryEntry.attempted += 1;
        summaryEntry.errors += 1;
      }
    }

    console.log("📊 Bulk upload summary", {
      totalRows: data.length,
      created: results.length,
      errors: errors.length
    });

    const summary = Array.from(attemptStats.values()).map((entry) => ({
      ...entry,
      pending: Math.max(entry.attempted - entry.created, 0)
    }));

    const errorBreakdown = Array.from(
      errors.reduce((acc, curr) => {
        const reason = curr.error || "Unknown error";
        acc.set(reason, (acc.get(reason) || 0) + 1);
        return acc;
      }, new Map())
    ).map(([reason, count]) => ({ reason, count }));

    const responsePayload = {
      success: false,
      uploaded: results.length,
      errorCount: errors.length,
      totalRows: data.length,
      results,
      summary,
      errorBreakdown,
      errorSamples: errors.slice(0, 10)
    };

    let status = "failed";
    if (results.length === 0) {
      responsePayload.message = "No questions were created. See errorSamples for details.";
      responsePayload.status = status;
      return res.status(400).json(responsePayload);
    }

    if (errors.length > 0) {
      status = "partial";
      responsePayload.message = `Uploaded ${results.length} questions with ${errors.length} errors.`;
      responsePayload.status = status;
      return res.status(207).json(responsePayload);
    }

    status = "success";
    responsePayload.success = true;
    responsePayload.status = status;
    responsePayload.message = "All questions uploaded successfully.";
    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Helper function to normalize paper type names
 */
function normalizePaperType(paperType) {
  if (!paperType) return paperType;
  
  const typeMap = {
    'WP1': 'WP-I',
    'WP2': 'WP-II',
    'WP3': 'WP-III',
    'WP-1': 'WP-I',
    'WP-2': 'WP-II',
    'WP-3': 'WP-III',
    'PR1': 'PR-I',
    'PR2': 'PR-II',
    'PR3': 'PR-III',
    'PR4': 'PR-IV',
    'PR5': 'PR-V',
    'PR-1': 'PR-I',
    'PR-2': 'PR-II',
    'PR-3': 'PR-III',
    'PR-4': 'PR-IV',
    'PR-5': 'PR-V'
  };
  
  return typeMap[paperType.toUpperCase()] || paperType;
}

/**
 * Helper function to decrypt .dat files (compatible with Django AES-256-GCM)
 */
function decryptDatFile(buffer, password) {
  try {
    console.log('🔐 Starting decryption with buffer size:', buffer.length);
    console.log('🔑 Password provided:', password ? 'YES' : 'NO');
    
    const SALT_SIZE = 16;
    const IV_SIZE = 12;
    const PBKDF2_ITERATIONS = 100000;
    const KEY_LENGTH = 32; // AES-256
    
    if (buffer.length < SALT_SIZE + IV_SIZE + 16) {
      throw new Error('File too short to be a valid encrypted .dat');
    }
    
    const salt = buffer.subarray(0, SALT_SIZE);
    const iv = buffer.subarray(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertextWithTag = buffer.subarray(SALT_SIZE + IV_SIZE);
    const authTag = ciphertextWithTag.subarray(-16); // last 16 bytes
    const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
    
    console.log('📦 Salt, IV, and auth tag extracted');
    console.log('🔑 Salt (hex):', salt.toString('hex'));
    console.log('🔑 IV (hex):', iv.toString('hex'));
    console.log('🔑 Auth tag (hex):', authTag.toString('hex'));
    console.log('🔑 Deriving key with PBKDF2...');
    
    // Derive key using PBKDF2-HMAC-SHA256 (same as Django)
    const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
    
    console.log('🔑 Key derived successfully, decrypting...');
    console.log('🔑 Key (first 8 bytes):', key.subarray(0, 8).toString('hex'));
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted;
    try {
      decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
    } catch (authError) {
      console.error('💥 Authentication failed:', authError.message);
      throw new Error('Authentication failed - wrong password or corrupted file');
    }
    
    // Sanity check: should start with 'PK' (Excel signature)
    const signature = decrypted.subarray(0, 2).toString('binary');
    if (!signature.startsWith('PK')) {
      console.error('💥 Invalid signature:', signature);
      throw new Error(`Decryption failed or wrong password. Expected 'PK' signature, got: ${signature}`);
    }
    
    console.log('✅ Decryption complete, result length:', decrypted.length);
    console.log('✅ Excel signature verified: PK');
    
    return decrypted; // Return Buffer for Excel parsing
  } catch (error) {
    console.error('💥 Decryption failed:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Debug endpoint to check question counts
 */
exports.debugQuestionCounts = async (req, res) => {
  try {
    console.log("🔍 Debug endpoint called");
    
    // Get all exam papers with question counts
    const examPapers = await prisma.examPaper.findMany({
      include: {
        trade: true,
        _count: {
          select: { questions: true }
        }
      }
    });

    console.log(`🔍 Found ${examPapers.length} exam papers`);

    // Get all exam slots
    const examSlots = await prisma.examSlot.findMany({
      include: {
        trade: true,
        command: true,
        center: true
      }
    });

    console.log(`🔍 Found ${examSlots.length} exam slots`);

    // Get all questions grouped by exam paper
    const questionsByPaper = await prisma.question.groupBy({
      by: ['examPaperId'],
      _count: {
        examPaperId: true
      }
    });

    console.log(`🔍 Found questions in ${questionsByPaper.length} papers`);

    // Create mapping between slots and papers
    const slotPaperMapping = [];
    for (const slot of examSlots) {
      const matchingPaper = examPapers.find(paper => 
        paper.tradeId === slot.tradeId && paper.paperType === slot.paperType
      );
      
      slotPaperMapping.push({
        slotId: slot.id,
        slotTrade: slot.trade?.name,
        slotPaperType: slot.paperType,
        slotTradeId: slot.tradeId,
        matchingPaperId: matchingPaper?.id,
        matchingPaperQuestions: matchingPaper?._count?.questions || 0,
        hasMatch: !!matchingPaper
      });
    }

    const response = {
      examPapers: examPapers.map(paper => ({
        id: paper.id,
        tradeId: paper.tradeId,
        tradeName: paper.trade.name,
        paperType: paper.paperType,
        isActive: paper.isActive,
        questionCount: paper._count.questions
      })),
      examSlots: examSlots.map(slot => ({
        id: slot.id,
        tradeId: slot.tradeId,
        tradeName: slot.trade?.name,
        paperType: slot.paperType,
        commandName: slot.command?.name,
        centerName: slot.center?.name,
        isActive: slot.isActive
      })),
      slotPaperMapping,
      questionsByPaper,
      totalPapers: examPapers.length,
      totalSlots: examSlots.length,
      totalQuestions: questionsByPaper.reduce((sum, group) => sum + group._count.examPaperId, 0),
      unmatchedSlots: slotPaperMapping.filter(mapping => !mapping.hasMatch).length
    };

    console.log("🔍 Debug response prepared:", {
      totalPapers: response.totalPapers,
      totalSlots: response.totalSlots,
      totalQuestions: response.totalQuestions,
      unmatchedSlots: response.unmatchedSlots
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Debug endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
};