const prisma = require("../config/prisma");
const XLSX = require("xlsx");

const GRADE_TABLE = [
  { grade: "A", minEach: 75, minOverall: 80 },
  { grade: "B", minEach: 60, minOverall: 70 },
  { grade: "C", minEach: 50, minOverall: 60 },
  { grade: "D", minEach: 45, minOverall: 50 },
  { grade: "E", minEach: 35, minOverall: 40 }
];

const PAPER_MAX_MARKS = {
  "WP-I": 100,
  "WP-II": 100,
  "WP-III": 100,
  "PR-I": 50,
  "PR-II": 50,
  "PR-III": 50,
  "PR-IV": 50,
  "PR-V": 50,
  ORAL: 50
};

const PRACTICAL_FIELD_MAP = {
  "PR-I": "pr1",
  "PR-II": "pr2",
  "PR-III": "pr3",
  "PR-IV": "pr4",
  "PR-V": "pr5",
  ORAL: "oral"
};

const getSelectedExamTypes = (candidate) => {
  if (!candidate.selectedExamTypes) return [];
  try {
    const parsed = JSON.parse(candidate.selectedExamTypes);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const computeGrade = ({ componentPercents, overallPercent, override }) => {
  if (override) {
    return { grade: override, source: "override" };
  }

  if (componentPercents.length === 0) {
    return { grade: "NA", source: "insufficient" };
  }

  const minComponent = Math.min(...componentPercents);

  const achieved = GRADE_TABLE.find((row) => {
    return (
      componentPercents.every((percent) => percent >= row.minEach) &&
      overallPercent >= row.minOverall
    );
  });

  if (!achieved) {
    if (overallPercent >= 0) {
      return { grade: "F", source: "computed", minComponent };
    }
    return { grade: "NA", source: "insufficient", minComponent };
  }

  return { grade: achieved.grade, source: "computed", minComponent };
};

/**
 * Full Army-style result
 */
exports.getResult = async (req, res) => {
  try {
    const candidateId = Number(req.params.candidateId);

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        trade: true,
        rank: true,
        command: true,
        center: true
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    if (!candidate.trade) {
      return res.status(400).json({ error: "Candidate trade information is missing" });
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { candidateId },
      include: {
        examPaper: true
      }
    });

    const attemptMap = new Map();
    attempts.forEach((attempt) => {
      const paperType = attempt.examPaper?.paperType;
      if (!paperType) return;
      attemptMap.set(paperType, attempt);
    });

    const selectedExamTypes = getSelectedExamTypes(candidate);
    const trade = candidate.trade;

    const writtenTypes = [
      { flag: "wp1", type: "WP-I" },
      { flag: "wp2", type: "WP-II" },
      { flag: "wp3", type: "WP-III" }
    ];

    const practicalTypes = [
      { flag: "pr1", type: "PR-I" },
      { flag: "pr2", type: "PR-II" },
      { flag: "pr3", type: "PR-III" },
      { flag: "pr4", type: "PR-IV" },
      { flag: "pr5", type: "PR-V" },
      { flag: "oral", type: "ORAL" }
    ];

    const writtenResults = writtenTypes
      .filter(({ flag }) => trade[flag])
      .map(({ type }) => {
        const attempt = attemptMap.get(type);
        const hasAttempt = Boolean(attempt);
        const effectiveMax = hasAttempt
          ? attempt.totalMarks ?? PAPER_MAX_MARKS[type] ?? 0
          : PAPER_MAX_MARKS[type] ?? 0;

        let score = null;
        let percentage = null;
        let status = "NA";

        if (hasAttempt) {
          const rawScore = typeof attempt.score === "number" ? attempt.score : 0;
          score = rawScore;
          if (effectiveMax > 0) {
            percentage = (rawScore / effectiveMax) * 100;
          }

          if (attempt.status === "COMPLETED" && percentage !== null) {
            status = percentage >= (trade.minPercent || 40) ? "PASS" : "FAIL";
          } else {
            status = attempt.status || "IN_PROGRESS";
          }
        } else if (selectedExamTypes.includes(type)) {
          status = "SCHEDULED";
        }

        return {
          type,
          score,
          maxMarks: effectiveMax,
          percentage: percentage !== null ? parseFloat(percentage.toFixed(2)) : null,
          status,
          submittedAt: attempt?.submittedAt || null
        };
      });

    let practicalMarks = null;
    const aptitudeScores = { bpet: "NA", ppt: "NA", cpt: "NA" };
    try {
      practicalMarks = await prisma.practicalMarks.findUnique({
        where: { candidateId: candidate.id },
        select: {
          pr1: true,
          pr2: true,
          pr3: true,
          pr4: true,
          pr5: true,
          oral: true,
          overallResult: true,
          gradeOverride: true
        }
      });

      if (practicalMarks) {
        try {
          const aptitudeColumns = await prisma.$queryRaw`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'PracticalMarks'
              AND COLUMN_NAME IN ('bpet', 'ppt', 'cpt')
          `;

          const availableColumns = new Set(
            Array.isArray(aptitudeColumns)
              ? aptitudeColumns.map((row) => row.COLUMN_NAME || row.column_name)
              : []
          );

          if (availableColumns.size > 0) {
            const selectFragments = [];
            if (availableColumns.has("bpet")) selectFragments.push("`bpet`");
            if (availableColumns.has("ppt")) selectFragments.push("`ppt`");
            if (availableColumns.has("cpt")) selectFragments.push("`cpt`");

          if (selectFragments.length > 0) {
              const rawQuery = `SELECT ${selectFragments.join(", ")} FROM PracticalMarks WHERE candidateId = ? LIMIT 1`;
              const aptitudeRows = await prisma.$queryRawUnsafe(rawQuery, candidate.id);
              if (Array.isArray(aptitudeRows) && aptitudeRows.length > 0) {
                const aptitudeRow = aptitudeRows[0];
                if (availableColumns.has("bpet") && aptitudeRow.bpet != null) {
                  aptitudeScores.bpet = aptitudeRow.bpet;
                }
                if (availableColumns.has("ppt") && aptitudeRow.ppt != null) {
                  aptitudeScores.ppt = aptitudeRow.ppt;
                }
                if (availableColumns.has("cpt") && aptitudeRow.cpt != null) {
                  aptitudeScores.cpt = aptitudeRow.cpt;
                }
              }
            }
          }
        } catch (aptitudeError) {
          console.warn(
            "Aptitude marks lookup failed for candidate",
            candidate.id,
            aptitudeError.message
          );
        }
      }
    } catch (practicalError) {
      console.warn(
        "Practical marks lookup failed for candidate",
        candidate.id,
        practicalError.message
      );
    }

    const practicalResults = practicalTypes
      .filter(({ flag }) => trade[flag])
      .map(({ type }) => {
        const fieldName = PRACTICAL_FIELD_MAP[type];
        const value = practicalMarks && fieldName ? practicalMarks[fieldName] : null;
        const parsed = value !== null && value !== undefined ? Number(value) : null;
        const maxMarks = PAPER_MAX_MARKS[type];
        const percentage = parsed !== null && maxMarks ? (parsed / maxMarks) * 100 : null;
        return {
          type,
          marks: parsed,
          maxMarks,
          percentage: percentage !== null ? parseFloat(percentage.toFixed(2)) : null
        };
      });

    const componentPercents = [];
    let totalScore = 0;
    let totalMax = 0;

    writtenResults.forEach((result) => {
      if (result.score !== null && result.maxMarks) {
        totalMax += result.maxMarks;
        totalScore += result.score;
        if (result.percentage !== null) {
          componentPercents.push(result.percentage);
        }
      }
    });

    practicalResults.forEach((result) => {
      if (result.marks !== null && result.maxMarks) {
        totalMax += result.maxMarks;
        totalScore += result.marks;
        if (result.percentage !== null) {
          componentPercents.push(result.percentage);
        }
      }
    });

    const overallPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    const gradeInfo = computeGrade({
      componentPercents,
      overallPercent,
      override: practicalMarks?.gradeOverride
    });

    const overallResult = practicalMarks?.overallResult
      || (overallPercent >= (trade.minPercent || 40) ? "PASS" : "FAIL");

    const theoryResultsForUi = writtenResults.map((result) => ({
      paper: result.type,
      score: result.score,
      totalMarks: result.maxMarks,
      percentage: result.percentage,
      status: result.status,
      submittedAt: result.submittedAt
    }));

    res.json({
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        rank: candidate.rank?.name || null,
        trade: candidate.trade?.name || null,
        unit: candidate.unit,
        medCat: candidate.medCat,
        corps: candidate.corps,
        command: candidate.command?.name || null,
        center: candidate.center?.name || null
      },
      trade: {
        id: trade.id,
        name: trade.name,
        minPercent: trade.minPercent || 40,
        negativeMarking: trade.negativeMarking || 0
      },
      writtenResults,
      theoryResults: theoryResultsForUi,
      practicalResults,
      summary: {
        totalScore: parseFloat(totalScore.toFixed(2)),
        totalMax,
        overallPercent: parseFloat(overallPercent.toFixed(2)),
        minPercent: trade.minPercent || 40,
        grade: gradeInfo.grade,
        gradeSource: gradeInfo.source,
        componentPercents: componentPercents.map((value) => parseFloat(value.toFixed(2))),
        overallResult,
        bpet: aptitudeScores.bpet,
        ppt: aptitudeScores.ppt,
        cpt: aptitudeScores.cpt,
        minComponentPercent: gradeInfo.minComponent ?? null
      },
      gradingTable: GRADE_TABLE,
      aptitude: { ...aptitudeScores }
    });
  } catch (error) {
    console.error("Error generating result for candidate", req.params.candidateId, error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get comprehensive results with filters
 */
exports.getAllResults = async (req, res) => {
  try {
    const { 
      tradeId, 
      paperType, 
      commandId, 
      centerId, 
      status,
      startDate,
      endDate,
      export: exportType 
    } = req.query;

    let whereClause = {};

    // Build filters
    if (tradeId) {
      whereClause.examPaper = {
        ...whereClause.examPaper,
        tradeId: Number(tradeId)
      };
    }

    if (paperType) {
      whereClause.examPaper = {
        ...whereClause.examPaper,
        paperType
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.submittedAt = {};
      if (startDate) {
        whereClause.submittedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.submittedAt.lte = new Date(endDate);
      }
    }

    let attempts = await prisma.examAttempt.findMany({
      where: whereClause,
      include: {
        candidate: {
          include: {
            trade: true,
            rank: true,
            command: true,
            center: true
          }
        },
        examPaper: {
          include: {
            trade: true
          }
        },
        examSlot: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    // Filter by command and center if specified
    if (commandId) {
      attempts = attempts.filter(attempt => 
        attempt.candidate.commandId === Number(commandId)
      );
    }

    if (centerId) {
      attempts = attempts.filter(attempt => 
        attempt.candidate.centerId === Number(centerId)
      );
    }

    // Calculate statistics
    const stats = {
      total: attempts.length,
      passed: attempts.filter(a => a.percentage >= 40).length,
      failed: attempts.filter(a => a.percentage < 40).length,
      averageScore: attempts.reduce((sum, a) => sum + a.percentage, 0) / (attempts.length || 1)
    };

    // Export if requested
    if (exportType) {
      return exportResults(attempts, exportType, res);
    }

    res.json({
      attempts,
      stats,
      filters: { tradeId, paperType, commandId, centerId, status, startDate, endDate }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get trade-wise results summary
 */
exports.getTradeWiseResults = async (req, res) => {
  try {
    const { export: exportType } = req.query;

    const trades = await prisma.trade.findMany({
      include: {
        candidates: {
          include: {
            examAttempts: {
              include: {
                examPaper: true
              }
            }
          }
        },
        examPapers: true
      }
    });

    const tradeResults = trades.map(trade => {
      const allAttempts = trade.candidates.flatMap(c => c.examAttempts);
      const completedAttempts = allAttempts.filter(a => a.status === "COMPLETED");
      
      return {
        tradeId: trade.id,
        tradeName: trade.name,
        totalCandidates: trade.candidates.length,
        totalAttempts: allAttempts.length,
        completedAttempts: completedAttempts.length,
        passedAttempts: completedAttempts.filter(a => a.percentage >= 40).length,
        failedAttempts: completedAttempts.filter(a => a.percentage < 40).length,
        averageScore: completedAttempts.length > 0 
          ? completedAttempts.reduce((sum, a) => sum + a.percentage, 0) / completedAttempts.length 
          : 0,
        paperBreakdown: trade.examPapers.map(paper => {
          const paperAttempts = completedAttempts.filter(a => a.examPaperId === paper.id);
          return {
            paperType: paper.paperType,
            attempts: paperAttempts.length,
            passed: paperAttempts.filter(a => a.percentage >= 40).length,
            averageScore: paperAttempts.length > 0
              ? paperAttempts.reduce((sum, a) => sum + a.percentage, 0) / paperAttempts.length
              : 0
          };
        })
      };
    });

    // Export if requested
    if (exportType) {
      return exportTradeResults(tradeResults, exportType, res);
    }

    res.json(tradeResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get candidate-wise results
 */
exports.getCandidateResults = async (req, res) => {
  try {
    const { export: exportType } = req.query;

    const candidates = await prisma.candidate.findMany({
      include: {
        trade: true,
        rank: true,
        command: true,
        center: true,
        examAttempts: {
          include: {
            examPaper: {
              include: {
                trade: true
              }
            },
            examSlot: true
          }
        },
        practicalMarks: true
      }
    });

    const candidateResults = candidates.map(candidate => {
      const attempts = candidate.examAttempts;
      const completedAttempts = attempts.filter(a => a.status === "COMPLETED");
      
      return {
        candidateId: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        rank: candidate.rank.name,
        trade: candidate.trade.name,
        command: candidate.command.name,
        center: candidate.center.name,
        selectedExamTypes: JSON.parse(candidate.selectedExamTypes || "[]"),
        totalAttempts: attempts.length,
        completedAttempts: completedAttempts.length,
        passedAttempts: completedAttempts.filter(a => a.percentage >= 40).length,
        averageScore: completedAttempts.length > 0
          ? completedAttempts.reduce((sum, a) => sum + a.percentage, 0) / completedAttempts.length
          : 0,
        writtenResults: completedAttempts.map(attempt => ({
          paperType: attempt.examPaper.paperType,
          score: attempt.score,
          totalMarks: attempt.totalMarks,
          percentage: attempt.percentage,
          status: attempt.percentage >= 40 ? "PASS" : "FAIL",
          submittedAt: attempt.submittedAt,
          slotInfo: attempt.examSlot ? {
            startTime: attempt.examSlot.startTime,
            endTime: attempt.examSlot.endTime,
            location: attempt.examSlot.location
          } : null
        })),
        practicalMarks: candidate.practicalMarks ? {
          pr1: candidate.practicalMarks.pr1,
          pr2: candidate.practicalMarks.pr2,
          pr3: candidate.practicalMarks.pr3,
          pr4: candidate.practicalMarks.pr4,
          pr5: candidate.practicalMarks.pr5,
          oral: candidate.practicalMarks.oral
        } : null
      };
    });

    // Export if requested
    if (exportType) {
      return exportCandidateResults(candidateResults, exportType, res);
    }

    res.json(candidateResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export results to different formats
 */
function exportResults(attempts, exportType, res) {
  try {
    if (exportType === 'excel') {
      const ws = XLSX.utils.json_to_sheet(attempts.map(attempt => ({
        'Army No': attempt.candidate.armyNo,
        'Name': attempt.candidate.name,
        'Rank': attempt.candidate.rank.name,
        'Trade': attempt.candidate.trade.name,
        'Command': attempt.candidate.command.name,
        'Center': attempt.candidate.center.name,
        'Paper Type': attempt.examPaper.paperType,
        'Score': attempt.score,
        'Total Marks': attempt.totalMarks,
        'Percentage': attempt.percentage.toFixed(2),
        'Status': attempt.percentage >= 40 ? 'PASS' : 'FAIL',
        'Submitted At': attempt.submittedAt,
        'Slot Location': attempt.examSlot?.location || 'N/A'
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=exam-results.xlsx');
      res.send(buffer);
      return;
    }

    if (exportType === 'csv') {
      const csvData = attempts.map(attempt => [
        attempt.candidate.armyNo,
        attempt.candidate.name,
        attempt.candidate.rank.name,
        attempt.candidate.trade.name,
        attempt.candidate.command.name,
        attempt.candidate.center.name,
        attempt.examPaper.paperType,
        attempt.score,
        attempt.totalMarks,
        attempt.percentage.toFixed(2),
        attempt.percentage >= 40 ? 'PASS' : 'FAIL',
        attempt.submittedAt,
        attempt.examSlot?.location || 'N/A'
      ]);

      const headers = [
        'Army No', 'Name', 'Rank', 'Trade', 'Command', 'Center',
        'Paper Type', 'Score', 'Total Marks', 'Percentage', 'Status', 
        'Submitted At', 'Slot Location'
      ];

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=exam-results.csv');
      res.send(csvContent);
      return;
    }

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function exportTradeResults(tradeResults, exportType, res) {
  try {
    if (exportType === 'excel') {
      const ws = XLSX.utils.json_to_sheet(tradeResults.map(trade => ({
        'Trade Name': trade.tradeName,
        'Total Candidates': trade.totalCandidates,
        'Total Attempts': trade.totalAttempts,
        'Completed Attempts': trade.completedAttempts,
        'Passed': trade.passedAttempts,
        'Failed': trade.failedAttempts,
        'Average Score': trade.averageScore.toFixed(2),
        'Pass Rate': trade.completedAttempts > 0 
          ? ((trade.passedAttempts / trade.completedAttempts) * 100).toFixed(2) + '%'
          : '0%'
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trade Results");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=trade-results.xlsx');
      res.send(buffer);
      return;
    }

    res.json(tradeResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function exportCandidateResults(candidateResults, exportType, res) {
  try {
    if (exportType === 'excel') {
      const ws = XLSX.utils.json_to_sheet(candidateResults.map(candidate => ({
        'Army No': candidate.armyNo,
        'Name': candidate.name,
        'Rank': candidate.rank,
        'Trade': candidate.trade,
        'Command': candidate.command,
        'Center': candidate.center,
        'Selected Exams': candidate.selectedExamTypes.join(', '),
        'Total Attempts': candidate.totalAttempts,
        'Completed': candidate.completedAttempts,
        'Passed': candidate.passedAttempts,
        'Average Score': candidate.averageScore.toFixed(2),
        'PR1': candidate.practicalMarks?.pr1 || 'N/A',
        'PR2': candidate.practicalMarks?.pr2 || 'N/A',
        'PR3': candidate.practicalMarks?.pr3 || 'N/A',
        'PR4': candidate.practicalMarks?.pr4 || 'N/A',
        'PR5': candidate.practicalMarks?.pr5 || 'N/A',
        'ORAL': candidate.practicalMarks?.oral || 'N/A'
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Candidate Results");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=candidate-results.xlsx');
      res.send(buffer);
      return;
    }

    res.json(candidateResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
