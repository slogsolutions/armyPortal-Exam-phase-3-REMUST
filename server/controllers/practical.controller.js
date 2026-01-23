const prisma = require("../config/prisma");

/**
 * Submit practical marks (for Exam Officer or Admin)
 */
exports.submitPractical = async (req, res) => {
  try {
    const { candidateId, examType, marks, enteredBy, bpet, ppt, cpt, overallResult, gradeOverride } = req.body;

    if (!candidateId) {
      return res.status(400).json({ error: "candidateId is required" });
    }

    if (!enteredBy) {
      return res.status(400).json({ error: "enteredBy (admin ID) is required" });
    }

    // Validate that we have at least some data to save
    const hasMarks = marks !== undefined && marks !== null && marks !== "";
    const hasExtras = [bpet, ppt, cpt, overallResult, gradeOverride].some(value => 
      value !== undefined && value !== null && value !== ""
    );

    if (!hasMarks && !hasExtras) {
      return res.status(400).json({ error: "Provide either exam marks or additional grading fields" });
    }

    // Validate examType if marks are provided
    const validTypes = ["PR-I", "PR-II", "PR-III", "PR-IV", "PR-V", "ORAL"];
    if (hasMarks && examType && !validTypes.includes(examType)) {
      return res.status(400).json({ error: "Invalid exam type. Must be PR-I, PR-II, PR-III, PR-IV, PR-V, or ORAL" });
    }

    // Find existing practical marks record
    let practicalMarks = await prisma.practicalMarks.findUnique({
      where: { candidateId: Number(candidateId) }
    });

    const updateData = {
      enteredBy: Number(enteredBy)
    };

    // Map exam type to field if marks are provided
    if (hasMarks && examType) {
      const parsedMarks = parseFloat(marks);
      if (isNaN(parsedMarks)) {
        return res.status(400).json({ error: "Invalid marks value" });
      }

      if (examType === "PR-I") updateData.pr1 = parsedMarks;
      else if (examType === "PR-II") updateData.pr2 = parsedMarks;
      else if (examType === "PR-III") updateData.pr3 = parsedMarks;
      else if (examType === "PR-IV") updateData.pr4 = parsedMarks;
      else if (examType === "PR-V") updateData.pr5 = parsedMarks;
      else if (examType === "ORAL") updateData.oral = parsedMarks;
    }

    // Add extra fields if provided
    if (bpet !== undefined && bpet !== null && bpet !== "") updateData.bpet = String(bpet).toUpperCase();
    if (ppt !== undefined && ppt !== null && ppt !== "") updateData.ppt = String(ppt).toUpperCase();
    if (cpt !== undefined && cpt !== null && cpt !== "") updateData.cpt = String(cpt).toUpperCase();
    if (overallResult !== undefined && overallResult !== null && overallResult !== "") updateData.overallResult = String(overallResult).toUpperCase();
    if (gradeOverride !== undefined && gradeOverride !== null && gradeOverride !== "") updateData.gradeOverride = String(gradeOverride).toUpperCase();

    if (practicalMarks) {
      // Update existing record
      practicalMarks = await prisma.practicalMarks.update({
        where: { candidateId: Number(candidateId) },
        data: updateData
      });
    } else {
      // Create new record
      practicalMarks = await prisma.practicalMarks.create({
        data: {
          candidateId: Number(candidateId),
          ...updateData
        }
      });
    }

    res.json({ success: true, practicalMarks });
  } catch (error) {
    console.error("Error in submitPractical:", error);
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

/**
 * Bulk submit practical marks for multiple candidates
 */
exports.bulkSubmitPractical = async (req, res) => {
  try {
    const { marks, enteredBy } = req.body;

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: "Marks array is required" });
    }

    if (!enteredBy) {
      return res.status(400).json({ error: "enteredBy (admin ID) is required" });
    }

    const results = [];
    const errors = [];

    for (const markEntry of marks) {
      try {
        const { candidateId, pr1, pr2, pr3, pr4, pr5, oral, bpet, ppt, cpt, overallResult, gradeOverride } = markEntry;

        if (!candidateId) {
          errors.push({ error: "candidateId is required", markEntry });
          continue;
        }

        // Validate candidate exists
        const candidate = await prisma.candidate.findUnique({
          where: { id: Number(candidateId) },
          include: { trade: true }
        });

        if (!candidate) {
          errors.push({ error: `Candidate not found: ${candidateId}`, markEntry });
          continue;
        }

        // Validate that the trade supports these exam types
        const updateData = { enteredBy: Number(enteredBy) };
        
        if (pr1 !== undefined && candidate.trade.pr1) updateData.pr1 = parseFloat(pr1);
        if (pr2 !== undefined && candidate.trade.pr2) updateData.pr2 = parseFloat(pr2);
        if (pr3 !== undefined && candidate.trade.pr3) updateData.pr3 = parseFloat(pr3);
        if (pr4 !== undefined && candidate.trade.pr4) updateData.pr4 = parseFloat(pr4);
        if (pr5 !== undefined && candidate.trade.pr5) updateData.pr5 = parseFloat(pr5);
        if (oral !== undefined && candidate.trade.oral) updateData.oral = parseFloat(oral);
        if (bpet !== undefined) updateData.bpet = bpet;
        if (ppt !== undefined) updateData.ppt = ppt;
        if (cpt !== undefined) updateData.cpt = cpt;
        if (overallResult !== undefined) updateData.overallResult = overallResult;
        if (gradeOverride !== undefined) updateData.gradeOverride = gradeOverride;

        // Find or create practical marks record
        let practicalMarks = await prisma.practicalMarks.findUnique({
          where: { candidateId: Number(candidateId) }
        });

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

        results.push({
          candidateId,
          success: true,
          practicalMarks
        });
      } catch (error) {
        errors.push({
          candidateId: markEntry.candidateId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: marks.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get practical marks summary by trade
 */
exports.getPracticalSummary = async (req, res) => {
  try {
    const { tradeId } = req.query;

    let whereClause = {};
    if (tradeId) {
      whereClause.tradeId = Number(tradeId);
    }

    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        trade: true,
        practicalMarks: true
      }
    });

    const summary = candidates.reduce((acc, candidate) => {
      const tradeName = candidate.trade.name;
      
      if (!acc[tradeName]) {
        acc[tradeName] = {
          tradeName,
          totalCandidates: 0,
          practicalMarksSubmitted: 0,
          pr1: { count: 0, total: 0, average: 0 },
          pr2: { count: 0, total: 0, average: 0 },
          pr3: { count: 0, total: 0, average: 0 },
          pr4: { count: 0, total: 0, average: 0 },
          pr5: { count: 0, total: 0, average: 0 },
          oral: { count: 0, total: 0, average: 0 }
        };
      }

      const tradeSummary = acc[tradeName];
      tradeSummary.totalCandidates++;

      if (candidate.practicalMarks) {
        tradeSummary.practicalMarksSubmitted++;
        
        ['pr1', 'pr2', 'pr3', 'pr4', 'pr5', 'oral'].forEach(field => {
          const marks = candidate.practicalMarks[field];
          if (marks !== null && marks !== undefined) {
            tradeSummary[field].count++;
            tradeSummary[field].total += marks;
          }
        });
      }

      return acc;
    }, {});

    // Calculate averages
    Object.values(summary).forEach(tradeSummary => {
      ['pr1', 'pr2', 'pr3', 'pr4', 'pr5', 'oral'].forEach(field => {
        if (tradeSummary[field].count > 0) {
          tradeSummary[field].average = tradeSummary[field].total / tradeSummary[field].count;
        }
      });
    });

    res.json(Object.values(summary));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
