const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

exports.login = async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ msg: "Username and password required" });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      console.log('❌ Admin not found:', username);
      return res.status(401).json({ msg: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ msg: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log('✅ Admin login successful:', username);
    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('💥 Admin login error:', err);
    res.status(500).json({ msg: "Login failed" });
  }
};
