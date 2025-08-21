import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url} - ${err.message}`);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
};

