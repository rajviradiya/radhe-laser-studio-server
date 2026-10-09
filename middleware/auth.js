import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ success: false, message: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    return res.status(401).json({ success: false, message: 'Missing authentication token.' });
  }

  try {
    // Explicitly verify using configured HS256 algorithm to prevent algorithm confusion attacks
    const decoded = jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
    if (!decoded || decoded.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Access forbidden: Administrator privileges required.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message:
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid session token. Please log in again.',
    });
  }
};
