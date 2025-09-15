// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT and populate req.user
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided or invalid format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    // Populate req.user with normalized role
    req.user = {
      id: decoded.id,
      role: decoded.role ? decoded.role.toLowerCase() : "user", // default role
    };

    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/**
 * Optional helper: Inline role guard
 * Can be used for quick per-route checks without importing roleMiddleware
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized: No user info" });
    }

    // Admin override
    if (req.user.role === "admin") return next();

    const allowed = allowedRoles.map(r => r.toLowerCase());
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: You do not have access" });
    }

    next();
  };
};

module.exports = { authMiddleware, requireRole };
