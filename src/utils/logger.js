import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf, colorize } = format;

// Log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Create logger
const logger = createLogger({
  level: 'debug', // log everything (error, warn, info, debug)
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    new transports.Console({ format: combine(colorize(), logFormat) }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
