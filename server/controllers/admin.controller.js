const prisma = require("../config/prisma");
const XLSX = require("xlsx");

/* ================= ADD MASTER DATA ================= */

exports.addRank = async (req, res) => {
  const rank = await prisma.rank.create({ data: req.body });
  res.json(rank);
};

exports.addTrade = async (req, res) => {
  const trade = await prisma.trade.create({ data: req.body });
  res.json(trade);
};

exports.addCommand = async (req, res) => {
  const command = await prisma.command.create({ data: req.body });
  res.json(command);
};

/* ================= UPDATE MASTER DATA ================= */

exports.updateCommand = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const command = await prisma.command.update({
      where: { id: Number(id) },
      data: updateData
    });
    
    res.json(command);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= DATA EXPORT & PURGE ================= */

exports.exportExamData = async (req, res) => {
  try {
    const format = (req.query.format || "excel").toLowerCase();

    const attempts = await prisma.examAttempt.findMany({
      include: {
        candidate: {
          include: {
            trade: true,
            rank: true,
            command: true,
            center: true
          }
        },
        examPaper: true,
        examSlot: true
      },
      orderBy: { submittedAt: "desc" }
    });

    const practicalMarks = await prisma.practicalMarks.findMany({
      include: {
        candidate: {
          include: {
            trade: true,
            rank: true,
            command: true,
            center: true
          }
        }
      }
    });

    if (format === "csv") {
      const headers = [
        "Army No",
        "Name",
        "Trade",
        "Paper Type",
        "Score",
        "Total Marks",
        "Percentage",
        "Status",
        "Submitted At"
      ];

      const csvRows = attempts.map((attempt) => [
        attempt.candidate?.armyNo || "",
        attempt.candidate?.name || "",
        attempt.candidate?.trade?.name || "",
        attempt.examPaper?.paperType || "",
        attempt.score,
        attempt.totalMarks,
        attempt.percentage?.toFixed(2) || "0",
        attempt.percentage >= 40 ? "PASS" : "FAIL",
        attempt.submittedAt || ""
      ]);

      const csv = [headers, ...csvRows]
        .map((row) => row.map((field) => `"${field ?? ""}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=exam-data.csv");
      return res.send(csv);
    }

    const workbook = XLSX.utils.book_new();

    const resultsSheet = XLSX.utils.json_to_sheet(
      attempts.map((attempt) => ({
        "Army No": attempt.candidate?.armyNo,
        Name: attempt.candidate?.name,
        Trade: attempt.candidate?.trade?.name,
        Rank: attempt.candidate?.rank?.name,
        Command: attempt.candidate?.command?.name,
        Center: attempt.candidate?.center?.name,
        "Paper Type": attempt.examPaper?.paperType,
        Score: attempt.score,
        "Total Marks": attempt.totalMarks,
        Percentage: attempt.percentage,
        Status: attempt.percentage >= 40 ? "PASS" : "FAIL",
        "Submitted At": attempt.submittedAt,
        "Slot Start": attempt.examSlot?.startTime,
        "Slot End": attempt.examSlot?.endTime
      }))
    );

    XLSX.utils.book_append_sheet(workbook, resultsSheet, "Exam Results");

    const practicalSheet = XLSX.utils.json_to_sheet(
      practicalMarks.map((record) => ({
        "Army No": record.candidate?.armyNo,
        Name: record.candidate?.name,
        Trade: record.candidate?.trade?.name,
        PR1: record.pr1,
        PR2: record.pr2,
        PR3: record.pr3,
        PR4: record.pr4,
        PR5: record.pr5,
        ORAL: record.oral,
        BPET: record.bpet,
        PPT: record.ppt,
        CPT: record.cpt,
        "Overall Result": record.overallResult,
        "Grade Override": record.gradeOverride
      }))
    );

    XLSX.utils.book_append_sheet(workbook, practicalSheet, "Practical Marks");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=exam-data.xlsx");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteOperationalData = async (_req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany();
      await tx.examAttempt.deleteMany();
      await tx.practicalMarks.deleteMany();
      await tx.examSlot.deleteMany();
      await tx.question.deleteMany();
      await tx.examPaper.deleteMany();
    });

    res.json({
      success: true,
      message: "All exam operational data cleared (candidates, trades, and admins retained)."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteExamContent = async (_req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany();
      await tx.examAttempt.deleteMany();
      await tx.question.deleteMany();
      await tx.examPaper.deleteMany();
    });

    res.json({
      success: true,
      message: "All uploaded exam papers and questions have been deleted."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCommand = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if command has candidates
    const candidatesCount = await prisma.candidate.count({
      where: { commandId: Number(id) }
    });
    
    if (candidatesCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete command. Candidates are associated with this command." 
      });
    }
    
    await prisma.command.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: "Command deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addCenter = async (req, res) => {
  // Center functionality removed - using Commands only
  res.status(404).json({ error: "Conducting Centers have been removed. Use Commands instead." });
};

/* ================= UPDATE MASTER DATA ================= */

exports.updateTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const trade = await prisma.trade.update({
      where: { id: Number(id) },
      data: updateData
    });
    
    res.json(trade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCommand = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const command = await prisma.command.update({
      where: { id: Number(id) },
      data: updateData
    });
    
    res.json(command);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCenter = async (req, res) => {
  // Center functionality removed - using Commands only
  res.status(404).json({ error: "Conducting Centers have been removed. Use Commands instead." });
};

exports.deleteCenter = async (req, res) => {
  // Center functionality removed - using Commands only
  res.status(404).json({ error: "Conducting Centers have been removed. Use Commands instead." });
};

/* ================= DELETE MASTER DATA ================= */

exports.deleteTrade = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if trade has candidates
    const candidatesCount = await prisma.candidate.count({
      where: { tradeId: Number(id) }
    });
    
    if (candidatesCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete trade with associated candidates" 
      });
    }
    
    await prisma.trade.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: "Trade deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ALL DROPDOWN OPTIONS ================= */

exports.getMasters = async (req, res) => {
  try {
    const [ranks, trades, commands, centers] = await Promise.all([
      prisma.rank.findMany({ orderBy: { name: "asc" } }),
      prisma.trade.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              examPapers: true,
              candidates: true
            }
          }
        }
      }),
      prisma.command.findMany({ orderBy: { name: "asc" } }),
      prisma.conductingCenter.findMany({
        orderBy: [{ commandId: "asc" }, { name: "asc" }],
        include: { command: true }
      })
    ]);

    res.json({
      ranks,
      trades,
      commands,
      centers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load master data" });
  }
};

exports.getCenters = async (req, res) => {
  try {
    const { commandId } = req.query;

    const centers = await prisma.conductingCenter.findMany({
      where: commandId ? { commandId: Number(commandId) } : undefined,
      orderBy: { name: "asc" },
      include: { command: true }
    });

    res.json(centers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load conducting centers" });
  }
};

/* ================= GET TRADES WITH CONFIG ================= */

exports.getTrades = async (req, res) => {
  try {
    const trades = await prisma.trade.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { 
            candidates: true,
            examPapers: true
          }
        }
      }
    });

    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= BULK TRADE CONFIGURATION ================= */

exports.bulkConfigureTrades = async (req, res) => {
  try {
    const { trades } = req.body;
    const results = [];
    const errors = [];

    for (const tradeConfig of trades) {
      try {
        const trade = await prisma.trade.upsert({
          where: { name: tradeConfig.name },
          update: tradeConfig,
          create: tradeConfig
        });
        results.push(trade);
      } catch (error) {
        errors.push({ trade: tradeConfig.name, error: error.message });
      }
    }

    res.json({
      success: true,
      updated: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
