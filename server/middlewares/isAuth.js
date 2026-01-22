const jwt = require("jsonwebtoken");

const isAuth = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ 
          success: false, 
          error: "Access denied. No token provided." 
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add user info to request
      req.user = decoded;

      const effectiveRoles = new Set();
      if (decoded.role) {
        effectiveRoles.add(decoded.role);
        if (decoded.role === "SUPER_ADMIN") {
          effectiveRoles.add("ADMIN");
        }
      }

      // Check if user role is allowed
      if (allowedRoles && !allowedRoles.some((role) => effectiveRoles.has(role))) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied. Insufficient permissions." 
        });
      }
      
      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token." 
      });
    }
  };
};

module.exports = isAuth;
