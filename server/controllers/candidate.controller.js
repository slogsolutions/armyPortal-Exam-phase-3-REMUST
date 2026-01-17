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
        error: "Please select at least one written exam type (WP-I or WP-II)"
      });
    }

    // Only allow WP-I and WP-II
    const validTypes = ["WP-I", "WP-II"];
    const invalidTypes = selectedExamTypes.filter(t => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Only WP-I and WP-II written exams can be selected"
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
        centerId: Number(centerId)
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

/* ================= GET CANDIDATE BY ID ================= */

exports.getCandidateById = async (req, res) => {
  try {
    const candidateId = Number(req.params.candidateId);

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        rank: true,
        trade: true,
        command: true,
        center: true
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
        command: true,
        center: true
      }
    });

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
