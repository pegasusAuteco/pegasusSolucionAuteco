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
