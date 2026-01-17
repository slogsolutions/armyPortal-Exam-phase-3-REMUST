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

exports.addCenter = async (req, res) => {
  const center = await prisma.conductingCenter.create({ data: req.body });
  res.json(center);
};

/* ================= GET ALL DROPDOWN OPTIONS ================= */

exports.getMasters = async (req, res) => {
  try {
    const [ranks, trades, commands, centers] = await Promise.all([
      prisma.rank.findMany({ orderBy: { name: "asc" } }),
      prisma.trade.findMany({ orderBy: { name: "asc" } }),
      prisma.command.findMany({ orderBy: { name: "asc" } }),
      prisma.conductingCenter.findMany({ orderBy: { name: "asc" } })
    ]);

    res.json({
      ranks,
      trades,
      commands,
      centers
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load master data" });
  }
};
