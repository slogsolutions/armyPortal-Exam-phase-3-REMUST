const prisma = require("../config/prisma");

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
