const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.admin = decoded; // { id, role }

    if (!["ADMIN", "SUPER_ADMIN"].includes(decoded.role)) {
      return res.status(403).json({ msg: "Access denied. Insufficient permissions." });
    }

    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};
