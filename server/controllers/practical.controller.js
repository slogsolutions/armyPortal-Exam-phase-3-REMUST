const prisma = require("../config/prisma");

/**
 * Submit practical marks (for Exam Officer or Admin)
 */
exports.submitPractical = async (req, res) => {
  try {
    const { candidateId, examType, marks, enteredBy } = req.body;

    if (!candidateId || !examType || marks === undefined || marks === null || !enteredBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate examType - must be PR-I, PR-II, PR-III, PR-IV, PR-V, or ORAL
    const validTypes = ["PR-I", "PR-II", "PR-III", "PR-IV", "PR-V", "ORAL"];
    if (!validTypes.includes(examType)) {
      return res.status(400).json({ error: "Invalid exam type. Must be PR-I, PR-II, PR-III, PR-IV, PR-V, or ORAL" });
    }

    // Find or create practical marks record
    let practicalMarks = await prisma.practicalMarks.findUnique({
      where: { candidateId: Number(candidateId) }
    });

    const updateData = {
      enteredBy: Number(enteredBy)
    };

    // Map exam type to field
    if (examType === "PR-I") updateData.pr1 = parseFloat(marks);
    else if (examType === "PR-II") updateData.pr2 = parseFloat(marks);
    else if (examType === "PR-III") updateData.pr3 = parseFloat(marks);
    else if (examType === "PR-IV") updateData.pr4 = parseFloat(marks);
    else if (examType === "PR-V") updateData.pr5 = parseFloat(marks);
    else if (examType === "ORAL") updateData.oral = parseFloat(marks);

    if (practicalMarks) {
      practicalMarks = await prisma.practicalMarks.update({
        where: { candidateId: Number(candidateId) },
        data: updateData
      });
    } else {
      practicalMarks = await prisma.practicalMarks.create({
        data: {
          candidateId: Number(candidateId),
          ...updateData
        }
      });
    }

    res.json({ success: true, practicalMarks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get practical marks for a candidate
 */
exports.getPractical = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const marks = await prisma.practicalMarks.findUnique({
      where: { candidateId: Number(candidateId) }
    });

    res.json(marks || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all candidates with practical marks (for Exam Officer)
 */
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        rank: true,
        trade: true,
        command: true,
        center: true,
        practicalMarks: true
      },
      orderBy: {
        armyNo: 'asc'
      }
    });

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
