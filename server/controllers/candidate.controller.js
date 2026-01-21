const prisma = require("../config/prisma");

/* ================= REGISTER CANDIDATE ================= */

exports.register = async (req, res) => {
  try {
    const {
      armyNo,
      name,
      unit,
      medCat,
      corps,
      dob,
      doe,
      rankId,
      tradeId,
      commandId,
      selectedExamTypes
    } = req.body;

    // Validate selectedExamTypes
    if (!selectedExamTypes || !Array.isArray(selectedExamTypes) || selectedExamTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please select at least one exam type (WP-I, WP-II, or WP-III)"
      });
    }

    // Validate exam types
    const validExamTypes = ["WP-I", "WP-II", "WP-III"];
    const invalidTypes = selectedExamTypes.filter(type => !validExamTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid exam types: ${invalidTypes.join(", ")}`
      });
    }

    const candidate = await prisma.candidate.create({
      data: {
        armyNo,
        name,
        unit,
        medCat,
        corps,
        dob: new Date(dob),
        doe: new Date(doe),
        selectedExamTypes: JSON.stringify(selectedExamTypes),
        rankId: Number(rankId),
        tradeId: Number(tradeId),
        commandId: Number(commandId)
      }
    });

    res.json({
      success: true,
      candidate
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

/* ================= LOGIN CANDIDATE ================= */

exports.login = async (req, res) => {
  try {
    console.log('🔐 Candidate login attempt:', req.body);
    
    const { armyNo, dob } = req.body;

    if (!armyNo || !dob) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        error: "Army number and date of birth are required"
      });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { armyNo },
      include: {
        rank: true,
        trade: true,
        command: true
      }
    });

    if (!candidate) {
      console.log('❌ Candidate not found:', armyNo);
      return res.status(401).json({
        success: false,
        error: "Invalid army number or date of birth"
      });
    }

    // Verify date of birth (convert to YYYY-MM-DD format for comparison)
    const candidateDob = new Date(candidate.dob).toISOString().split('T')[0];
    const providedDob = new Date(dob).toISOString().split('T')[0];

    if (candidateDob !== providedDob) {
      console.log('❌ Date mismatch for:', armyNo);
      return res.status(401).json({
        success: false,
        error: "Invalid army number or date of birth"
      });
    }

    // Create a simple token for candidate
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { 
        id: candidate.id, 
        armyNo: candidate.armyNo,
        role: 'CANDIDATE'
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log('✅ Candidate login successful:', armyNo);
    res.json({
      success: true,
      token,
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        rank: candidate.rank,
        trade: candidate.trade,
        command: candidate.command
      }
    });
  } catch (err) {
    console.error('💥 Candidate login error:', err);
    res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
};

/* ================= GET CANDIDATE BY ID ================= */

exports.getCandidateById = async (req, res) => {
  try {
    const candidateId = Number(req.params.candidateId);

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        rank: true,
        trade: true,
        command: true
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ALL CANDIDATES (OPTIONAL) ================= */

exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        rank: true,
        trade: true,
        command: true
      }
    });

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
