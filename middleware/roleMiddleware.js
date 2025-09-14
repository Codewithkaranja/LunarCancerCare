// middleware/roleMiddleware.js

/**
 * Middleware to restrict access based on user roles.
 * @param {Array<string>} allowedRoles - Array of roles that can access the route.
 */
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user info exists on request
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: "Unauthorized: No user or role found" });
      }

      const userRole = req.user.role.toLowerCase();

      // Admin override: always has access
      if (userRole === "admin") return next();

      // Check if user's role is allowed
      const allowed = allowedRoles.map(r => r.toLowerCase());
      if (!allowed.includes(userRole)) {
        return res.status(403).json({ message: "Forbidden: You do not have access" });
      }

      // User is allowed
      next();
    } catch (error) {
      console.error("Role middleware error:", error);
      return res.status(500).json({ message: "Internal Server Error in role middleware" });
    }
  };
};

module.exports = roleMiddleware;
