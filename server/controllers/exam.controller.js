const prisma = require("../config/prisma");
const XLSX = require("xlsx");
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
      include: { trade: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Parse selected exam types from JSON string
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // Only get WP-I, WP-II, and WP-III papers
    const papers = await prisma.examPaper.findMany({
      where: { 
        tradeId: candidate.tradeId,
        paperType: { in: ["WP-I", "WP-II", "WP-III"] },
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
 * Start exam with slot validation
 */
exports.startExam = async (req, res) => {
  try {
    const { candidateId, examPaperId, examSlotId } = req.body;

    // Validate candidate
    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: { trade: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Validate exam paper
    const paper = await prisma.examPaper.findUnique({
      where: { id: Number(examPaperId) },
      include: { questions: true }
    });

    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }

    // Validate slot if provided
    if (examSlotId) {
      const slot = await prisma.examSlot.findUnique({
        where: { id: Number(examSlotId) }
      });

      if (!slot) {
        return res.status(404).json({ error: "Exam slot not found" });
      }

      // Check if current time is within slot time
      const now = new Date();
      if (now < new Date(slot.startTime)) {
        return res.status(400).json({ error: "Exam slot has not started yet" });
      }
      if (now > new Date(slot.endTime)) {
        return res.status(400).json({ error: "Exam slot has ended" });
      }

      // Check if candidate is assigned to this slot
      const isAssigned = await prisma.examSlot.findFirst({
        where: {
          id: Number(examSlotId),
          candidates: {
            some: { id: Number(candidateId) }
          }
        }
      });

      if (!isAssigned) {
        return res.status(403).json({ error: "Candidate not assigned to this exam slot" });
      }
    }

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

    // Create new attempt
    attempt = await prisma.examAttempt.create({
      data: {
        candidateId: Number(candidateId),
        examPaperId: Number(examPaperId),
        examSlotId: examSlotId ? Number(examSlotId) : null,
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

        if (!tradeName || !paperType || !questionText) {
          errors.push({ row, error: "Missing required fields (Trade, PaperType, Question)" });
          continue;
        }

        // Validate paper type
        const validPaperTypes = ["WP-I", "WP-II", "WP-III", "PR-I", "PR-II", "PR-III", "PR-IV", "PR-V", "ORAL"];
        if (!validPaperTypes.includes(paperType)) {
          errors.push({ row, error: `Invalid paper type: ${paperType}. Valid types: ${validPaperTypes.join(', ')}` });
          continue;
        }

        const normalizedTradeName = (tradeName || "").trim();
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
          continue;
        }

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
          continue;
        }

        // Get question count for ordering
        const questionCount = await prisma.question.count({
          where: { examPaperId: paper.id }
        });

        // Create question (only for written exams)
        if (paper) {
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
        }
      } catch (err) {
        console.error("❌ Row processing failed", { row, error: err.message });
        errors.push({ row, error: err.message });
      }
    }

    console.log("📊 Bulk upload summary", {
      totalRows: data.length,
      created: results.length,
      errors: errors.length
    });

    const responsePayload = {
      success: results.length > 0 && errors.length === 0,
      uploaded: results.length,
      errorCount: errors.length,
      results,
      errorSamples: errors.slice(0, 10)
    };

    if (results.length === 0) {
      responsePayload.success = false;
      responsePayload.message = "No questions were created. See errorSamples for details.";
      return res.status(400).json(responsePayload);
    }

    if (errors.length > 0) {
      responsePayload.message = `Uploaded ${results.length} questions with ${errors.length} errors.`;
      return res.status(207).json(responsePayload);
    }

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
