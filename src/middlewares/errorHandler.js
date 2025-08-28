import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url} - ${err.message}`);

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ error: message });
};
