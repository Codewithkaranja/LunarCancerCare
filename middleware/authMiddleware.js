const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT and populate req.user
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "No token provided or invalid format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // ✅ Use env secret strictly
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Keep role lowercase + attach other claims
    req.user = {
      id: decoded.id,
      username: decoded.username || null, // in case you need it later
      role: decoded.role ? decoded.role.toLowerCase() : "user",
    };

    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/**
 * Role guard middleware
 * Usage: router.get("/admin", authMiddleware, requireRole(["admin"]), handler)
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user info" });
    }

    const allowed = allowedRoles.map((r) => r.toLowerCase());

    // ✅ Admin override: admin can access everything
    if (req.user.role === "admin" || allowed.includes(req.user.role)) {
      return next();
    }

    return res
      .status(403)
      .json({ message: "Forbidden: You do not have access" });
  };
};

module.exports = { authMiddleware, requireRole };
