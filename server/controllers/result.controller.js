const prisma = require("../config/prisma");
const XLSX = require("xlsx");

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

    const attempts = await prisma.examAttempt.findMany({
      where: { candidateId },
      include: {
        examPaper: {
          include: {
            questions: true
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Create a map of paper types to results
    const resultsMap = {};
    
    attempts.forEach(attempt => {
      resultsMap[attempt.examPaper.paperType] = {
        paper: attempt.examPaper.paperType,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: parseFloat(attempt.percentage.toFixed(2)),
        status: attempt.status,
        submittedAt: attempt.submittedAt
      };
    });

    // Get all available exam types for this trade
    const trade = candidate.trade;
    const examTypes = [];
    
    if (trade.wp1) examTypes.push({ type: "WP-I", label: "WP-I" });
    if (trade.wp2) examTypes.push({ type: "WP-II", label: "WP-II" });
    if (trade.wp3) examTypes.push({ type: "WP-III", label: "WP-III" });
    if (trade.pr1) examTypes.push({ type: "PR-I", label: "PR-I" });
    if (trade.pr2) examTypes.push({ type: "PR-II", label: "PR-II" });
    if (trade.pr3) examTypes.push({ type: "PR-III", label: "PR-III" });
    if (trade.pr4) examTypes.push({ type: "PR-IV", label: "PR-IV" });
    if (trade.pr5) examTypes.push({ type: "PR-V", label: "PR-V" });
    if (trade.oral) examTypes.push({ type: "ORAL", label: "ORAL" });

    // Parse selected exam types
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // Only show WP-I, WP-II, and WP-III for theory results
    const writtenExamTypes = examTypes.filter(et => 
      ["WP-I", "WP-II", "WP-III"].includes(et.type) && selectedTypes.includes(et.type)
    );

    // Build theory results array
    const theoryResults = writtenExamTypes.map(examType => {
      if (resultsMap[examType.type]) {
        return resultsMap[examType.type];
      }
      return {
        paper: examType.label,
        status: "NA",
        score: null,
        totalMarks: null,
        percentage: null
      };
    });

    // Get practical marks
    const practicalMarks = await prisma.practicalMarks.findUnique({
      where: { candidateId: candidate.id }
    });

    // Build practical results array
    const practicalResults = [];
    if (trade.pr1) practicalResults.push({ type: "PR-I", marks: practicalMarks?.pr1 || null });
    if (trade.pr2) practicalResults.push({ type: "PR-II", marks: practicalMarks?.pr2 || null });
    if (trade.pr3) practicalResults.push({ type: "PR-III", marks: practicalMarks?.pr3 || null });
    if (trade.pr4) practicalResults.push({ type: "PR-IV", marks: practicalMarks?.pr4 || null });
    if (trade.pr5) practicalResults.push({ type: "PR-V", marks: practicalMarks?.pr5 || null });
    if (trade.oral) practicalResults.push({ type: "ORAL", marks: practicalMarks?.oral || null });

    res.json({
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        rank: candidate.rank.name,
        trade: candidate.trade.name,
        unit: candidate.unit,
        medCat: candidate.medCat,
        corps: candidate.corps,
        command: candidate.command.name,
        center: candidate.center.name
      },
      theoryResults,
      practicalResults,
      trade
    });
  } catch (error) {
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
