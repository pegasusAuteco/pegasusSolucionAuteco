import rateLimit from 'express-rate-limit'

// TODO: habilitar en producción con los tiempos correctos
// export const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: 5,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
// })

// export const registerLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hora
//   max: 3,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { error: 'Demasiados registros desde esta IP.' },
// })

export const loginLimiter = (req, res, next) => next()
export const registerLimiter = (req, res, next) => next()
