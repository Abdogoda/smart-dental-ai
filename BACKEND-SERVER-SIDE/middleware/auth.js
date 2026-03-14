const jwt = require('jsonwebtoken');

/**
 * Middleware that protects routes requiring authentication.
 * Expects the header:  Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, access denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.patient = decoded; // { id, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
