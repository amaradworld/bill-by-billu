const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const ROLES = {
  OWNER: 'OWNER',
  ACCOUNTANT: 'ACCOUNTANT',
  VIEWER: 'VIEWER',
};

const PERMISSIONS = {
  [ROLES.OWNER]: ['read', 'write', 'delete', 'admin', 'billing'],
  [ROLES.ACCOUNTANT]: ['read', 'write'],
  [ROLES.VIEWER]: ['read'],
};

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role || ROLES.OWNER;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      req.userRole = decoded.role || ROLES.OWNER;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    const role = req.userRole || ROLES.VIEWER;
    const allowed = PERMISSIONS[role] || [];
    const hasPermission = permissions.every(p => allowed.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function requireOwner(req, res, next) {
  if (req.userRole !== ROLES.OWNER) {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}

module.exports = { authenticate, optionalAuth, requirePermission, requireOwner, JWT_SECRET, ROLES, PERMISSIONS };
