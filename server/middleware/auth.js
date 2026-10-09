import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { users } from '../services/demoDataService.js'
import { isDatabaseConfigured } from '../services/databaseService.js'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured before authentication is used.')
  return process.env.JWT_SECRET
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, getJwtSecret())
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' })
  }

  try {
    const account = isDatabaseConfigured()
      ? await User.findById(decoded.id).select('status').lean()
      : users.find((user) => String(user.id) === String(decoded.id) || user.email === decoded.email)
    if (!account || account.status === 'Inactive') {
      return res.status(403).json({ message: 'This account is inactive or no longer available.' })
    }
    req.user = decoded
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this resource.' })
    }
    return next()
  }
}
