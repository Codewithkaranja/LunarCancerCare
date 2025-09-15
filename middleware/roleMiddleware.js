/**
 * Middleware to restrict access based on user roles.
 * @param {string|Array<string>} allowedRoles - Single role or array of roles that can access the route.
 */
const roleMiddleware = (allowedRoles = []) => {
  // Normalize input to array
  if (!Array.isArray(allowedRoles)) allowedRoles = [allowedRoles];

  return (req, res, next) => {
    try {
      // Check if user info exists on request
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: "Unauthorized: No user or role found" });
      }

      const userRole = req.user.role.toString().trim().toLowerCase();

      // Admin override: always has access
      if (userRole === "admin") return next();

      // Normalize allowed roles
      const allowed = allowedRoles.map(r => r.toString().trim().toLowerCase());

      // Check access
      if (!allowed.includes(userRole)) {
        return res.status(403).json({ message: "Forbidden: You do not have access" });
      }

      // User is allowed
      next();
    } catch (error) {
      console.error(
        `Role middleware error for user ${req.user?.username || "unknown"} with role ${req.user?.role || "N/A"}:`,
        error
      );
      return res.status(500).json({ message: "Internal Server Error in role middleware" });
    }
  };
};

module.exports = roleMiddleware;
