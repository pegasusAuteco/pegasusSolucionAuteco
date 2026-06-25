/**
 * Authentication middleware for Express routes.
 *
 * Checks that a valid JWT exists in the session and hasn't expired.
 * Attaches the JWT to req.jwt for downstream use by proxy and services.
 */

/**
 * Extracts the expiration timestamp from a JWT's payload.
 * @param {string} token - The JWT string
 * @returns {number|null} Expiration timestamp in seconds, or null if invalid
 */
function getTokenExp(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    )
    return payload.exp ?? null
  } catch {
    return null
  }
}

/**
 * Express middleware that enforces authentication.
 * Returns 401 if no JWT in session or if the token has expired.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  if (!req.session?.jwt) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const exp = getTokenExp(req.session.jwt)
  if (exp !== null && exp < Math.floor(Date.now() / 1000)) {
    req.session.destroy(() => {})
    return res.status(401).json({ error: 'Sesión expirada' })
  }

  req.jwt = req.session.jwt
  next()
}
