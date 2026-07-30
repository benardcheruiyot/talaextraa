// Authentication Middleware
const { AppError } = require('./errorHandler');
const { verifyJwt } = require('../utils/jwtSecret');

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new AppError('No token provided', 401));
    }

    const decoded = verifyJwt(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = { protect };
