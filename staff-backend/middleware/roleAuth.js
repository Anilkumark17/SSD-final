const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Check if user's role is in the allowed roles array
    // req.user.roles is an array
    const userRoles = req.user.roles || [];
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRoles: userRoles
      });
    }

    next();
  };
};

// Strict role check - user must have ALL specified roles
const checkStrictRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const userRoles = req.user.roles || [];
    const hasAllRoles = requiredRoles.every(role => userRoles.includes(role));

    if (!hasAllRoles) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires all of the following roles: ${requiredRoles.join(', ')}`,
        userRoles: userRoles
      });
    }

    next();
  };
};

module.exports = { checkRole, checkStrictRole };
