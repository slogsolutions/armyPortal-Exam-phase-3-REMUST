const prisma = require("../config/prisma");
const { attachQuestionCounts } = require("../utils/questionCounts");

const WRITTEN_PAPER_TYPES = [
  ["wp1", "WP-I"],
  ["wp2", "WP-II"],
  ["wp3", "WP-III"],
];

const parseSelectedExamTypesString = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const normalizeSelectedExamTypesInput = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const writtenTypesForTrade = (trade) => {
  if (!trade) return [];
  return WRITTEN_PAPER_TYPES
    .filter(([flag]) => Boolean(trade[flag]))
    .map(([, label]) => label);
};

const stringifySelectedExamTypes = (types) => JSON.stringify(Array.from(new Set(types)));

const parseDateInput = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const recalcSlotCurrentCount = async (tx, slotId) => {
  const count = await tx.candidate.count({
    where: {
      examSlots: {
        some: { id: slotId }
      }
    }
  });

  await tx.examSlot.update({
    where: { id: slotId },
    data: { currentCount: count }
  });
};

const loadCandidateDetail = async (candidateId) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      rank: true,
      trade: true,
      command: true,
      center: true,
      practicalMarks: true,
      examSlots: {
        include: {
          trade: true,
          command: true,
          center: true
        }
      },
      examAttempts: {
        include: {
          examPaper: true,
          examSlot: true,
          answers: { select: { id: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!candidate) {
    return null;
  }

  const selectedExamTypes = parseSelectedExamTypesString(candidate.selectedExamTypes);
  const examSlots = await attachQuestionCounts(candidate.examSlots || [], prisma);

  return {
    ...candidate,
    examSlots,
    selectedExamTypes,
    examAttempts: candidate.examAttempts?.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      score: attempt.score,
      percentage: attempt.percentage,
      totalMarks: attempt.totalMarks,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      examPaper: attempt.examPaper,
      examSlot: attempt.examSlot,
      answersRecorded: attempt.answers?.length ?? undefined
    })) || []
  };
};

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

    const trade = await prisma.trade.findUnique({ where: { id: Number(tradeId) } });

    if (!trade) {
      return res.status(400).json({
        success: false,
        error: "Selected trade not found"
      });
    }

    const allowedExamTypes = writtenTypesForTrade(trade);

    const normalizedExamTypes = normalizeSelectedExamTypesInput(selectedExamTypes).filter((type) =>
      allowedExamTypes.includes(type)
    );

    if (!normalizedExamTypes.length) {
      return res.status(400).json({
        success: false,
        error: "Selected exam types are not enabled for the chosen trade"
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
        selectedExamTypes: stringifySelectedExamTypes(normalizedExamTypes),
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

    const candidate = await loadCandidateDetail(candidateId);

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= UPDATE CANDIDATE (ADMIN) ================= */

exports.updateCandidate = async (req, res) => {
  const candidateId = Number(req.params.candidateId);

  try {
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        trade: true,
        examSlots: { select: { id: true } }
      }
    });

    if (!existingCandidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const {
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
      selectedExamTypes,
      slotIds
    } = req.body;

    const updatePayload = {};

    if (name !== undefined) updatePayload.name = name;
    if (unit !== undefined) updatePayload.unit = unit;
    if (medCat !== undefined) updatePayload.medCat = medCat;
    if (corps !== undefined) updatePayload.corps = corps;
    if (dob !== undefined) {
      const parsedDob = parseDateInput(dob);
      if (!parsedDob) {
        return res.status(400).json({ error: "Invalid date format for dob" });
      }
      updatePayload.dob = parsedDob;
    }
    if (doe !== undefined) {
      const parsedDoe = parseDateInput(doe);
      if (!parsedDoe) {
        return res.status(400).json({ error: "Invalid date format for doe" });
      }
      updatePayload.doe = parsedDoe;
    }
    if (rankId !== undefined) updatePayload.rankId = Number(rankId);
    if (commandId !== undefined) updatePayload.commandId = Number(commandId);
    if (centerId !== undefined) updatePayload.centerId = centerId ? Number(centerId) : null;

    let resolvedTrade = existingCandidate.trade;
    if (tradeId !== undefined) {
      resolvedTrade = await prisma.trade.findUnique({ where: { id: Number(tradeId) } });
      if (!resolvedTrade) {
        return res.status(400).json({ error: "Selected trade not found" });
      }
      updatePayload.tradeId = Number(tradeId);
    }

    const allowedExamTypes = writtenTypesForTrade(resolvedTrade);

    let normalizedExamTypes = parseSelectedExamTypesString(existingCandidate.selectedExamTypes);
    if (selectedExamTypes !== undefined) {
      normalizedExamTypes = normalizeSelectedExamTypesInput(selectedExamTypes).filter((type) =>
        allowedExamTypes.includes(type)
      );

      if (!normalizedExamTypes.length) {
        return res.status(400).json({
          error: "Selected exam types are not enabled for the chosen trade"
        });
      }

      updatePayload.selectedExamTypes = stringifySelectedExamTypes(normalizedExamTypes);
    }

    const slotIdList = Array.isArray(slotIds)
      ? slotIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
      : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const updatedCandidate = await tx.candidate.update({
        where: { id: candidateId },
        data: updatePayload
      });

      if (slotIdList) {
        const slots = await tx.examSlot.findMany({
          where: { id: { in: slotIdList } },
          include: {
            trade: true,
            command: true,
            center: true
          }
        });

        if (slots.length !== slotIdList.length) {
          throw new Error("One or more exam slots not found");
        }

        for (const slot of slots) {
          if (slot.tradeId !== updatedCandidate.tradeId) {
            throw new Error(`Slot ${slot.id} trade does not match candidate trade`);
          }

          if (slot.commandId !== updatedCandidate.commandId) {
            throw new Error(`Slot ${slot.id} command does not match candidate command`);
          }

          if (updatedCandidate.centerId && slot.centerId !== updatedCandidate.centerId) {
            throw new Error(`Slot ${slot.id} center does not match candidate center`);
          }
        }

        await tx.candidate.update({
          where: { id: candidateId },
          data: {
            examSlots: {
              set: [],
              connect: slotIdList.map((id) => ({ id }))
            }
          }
        });

        const affectedSlotIds = new Set([
          ...existingCandidate.examSlots.map((slot) => slot.id),
          ...slotIdList
        ]);

        await Promise.all(
          Array.from(affectedSlotIds).map((slotId) => recalcSlotCurrentCount(tx, slotId))
        );
      }

      return updatedCandidate;
    });

    const hydrated = await loadCandidateDetail(result.id);

    res.json({ success: true, candidate: hydrated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/* ================= DELETE CANDIDATE (ADMIN) ================= */

exports.deleteCandidate = async (req, res) => {
  const candidateId = Number(req.params.candidateId);

  try {
    const existing = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { examSlots: { select: { id: true } } }
    });

    if (!existing) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({ where: { examAttempt: { candidateId } } });
      await tx.examAttempt.deleteMany({ where: { candidateId } });
      await tx.practicalMarks.deleteMany({ where: { candidateId } });

      await tx.candidate.delete({ where: { id: candidateId } });

      if (existing.examSlots?.length) {
        await Promise.all(
          existing.examSlots.map((slot) => recalcSlotCurrentCount(tx, slot.id))
        );
      }
    });

    res.json({ success: true });
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
        center: true,
        practicalMarks: true,
        examAttempts: {
          include: {
            examPaper: {
              select: { paperType: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const mapped = candidates.map((candidate) => {
      const selectedExamTypes = parseSelectedExamTypesString(candidate.selectedExamTypes);
      const completedAttempts = candidate.examAttempts.filter((attempt) => attempt.status === "COMPLETED");
      const inProgressAttempts = candidate.examAttempts.filter((attempt) => attempt.status === "IN_PROGRESS");

      return {
        ...candidate,
        selectedExamTypes,
        attemptSummary: {
          completed: completedAttempts.length,
          inProgress: inProgressAttempts.length,
          total: candidate.examAttempts.length,
        }
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
