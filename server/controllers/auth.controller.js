const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return res.status(401).json({ msg: "Invalid user" });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(401).json({ msg: "Invalid password" });

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET
  );

  res.json({ token });
};
