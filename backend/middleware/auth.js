const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'lecture_ai_secret_change_in_prod';
const EXPIRY = '7d';

function createToken(username, role) {
  return jwt.sign({ username, role }, SECRET, { expiresIn: EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Express middleware — attaches req.user or returns 401
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token.' });
  req.user = payload;
  next();
}

// Only allow faculty role
function requireFaculty(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Faculty access only.' });
    next();
  });
}

module.exports = { createToken, verifyToken, requireAuth, requireFaculty };
