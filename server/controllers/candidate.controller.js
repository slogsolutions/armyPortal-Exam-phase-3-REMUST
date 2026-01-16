const prisma = require("../config/prisma");

exports.register = async (req, res) => {
  const candidate = await prisma.candidate.create({ data: req.body });
  res.json(candidate);
};
