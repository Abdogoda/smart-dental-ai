const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server error';

  res.status(statusCode).json({
    message,
    error: statusCode >= 500 ? err.message : undefined,
  });
};

module.exports = errorHandler;
