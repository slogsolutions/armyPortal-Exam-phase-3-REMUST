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
      centerId,
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
        commandId: Number(commandId),
        centerId: centerId ? Number(centerId) : null
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

/* ================= PEEK CANDIDATE (PUBLIC) ================= */

exports.peek = async (req, res) => {
  try {
    const { armyNo } = req.body;

    if (!armyNo) {
      return res.status(400).json({ candidate: null, error: "Army number required" });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { armyNo },
      include: {
        trade: true,
        command: true,
        center: true
      }
    });

    if (!candidate) {
      return res.json({ candidate: null });
    }

    res.json({
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        trade: candidate.trade ? { id: candidate.trade.id, name: candidate.trade.name } : null,
        command: candidate.command ? { id: candidate.command.id, name: candidate.command.name } : null,
        center: candidate.center ? { id: candidate.center.id, name: candidate.center.name } : null,
        selectedExamTypes: JSON.parse(candidate.selectedExamTypes || "[]")
      }
    });
  } catch (error) {
    res.status(500).json({ candidate: null, error: error.message });
  }
};

/* ================= LOGIN CANDIDATE ================= */

exports.login = async (req, res) => {
  try {
    console.log('🔐 Candidate login attempt:', req.body);
    
    const { armyNo, dob, paperType } = req.body;

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
        command: true,
        center: true
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

    const selectedTypes = JSON.parse(candidate.selectedExamTypes || "[]");
    let activePaperType = paperType || null;

    if (selectedTypes.length === 0) {
      activePaperType = null;
    } else if (selectedTypes.length === 1) {
      activePaperType = selectedTypes[0];
    } else {
      if (!activePaperType) {
        return res.status(400).json({
          success: false,
          error: "Please select the written paper you wish to attempt",
          requiredPapers: selectedTypes
        });
      }

      if (!selectedTypes.includes(activePaperType)) {
        return res.status(400).json({
          success: false,
          error: "Selected paper type is not registered for this candidate",
          requiredPapers: selectedTypes
        });
      }
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
        command: candidate.command,
        center: candidate.center,
        selectedExamTypes: selectedTypes,
        activePaperType
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
