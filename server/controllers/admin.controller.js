const prisma = require("../config/prisma");

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
    const [ranks, trades, commands] = await Promise.all([
      prisma.rank.findMany({ orderBy: { name: "asc" } }),
      prisma.trade.findMany({ orderBy: { name: "asc" } }),
      prisma.command.findMany({ orderBy: { name: "asc" } })
    ]);

    res.json({
      ranks,
      trades,
      commands
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load master data" });
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
