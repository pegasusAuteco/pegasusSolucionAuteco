/**
 * Rate limiting middleware for authentication endpoints.
 *
 * Currently disabled (pass-through) for development.
 * Enable the exported limiters in production with appropriate thresholds.
 */
import rateLimit from 'express-rate-limit'

// TODO: Enable in production with correct time windows
// export const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { error: 'Too many attempts. Try again in 15 minutes.' },
// })

// export const registerLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { error: 'Too many registrations from this IP.' },
// })

// Pass-through middleware (no-op) for development
export const loginLimiter = (req, res, next) => next()
export const registerLimiter = (req, res, next) => next()
