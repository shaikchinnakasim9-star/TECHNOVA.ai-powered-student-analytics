import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { users } from '../services/demoDataService.js'
import { User } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured before authentication is used.')
  return process.env.JWT_SECRET
}

export async function login(req, res) {
  const { email, password, role } = req.body || {}
  const normalizedEmail = String(email || '').trim().toLowerCase()

  const user = isDatabaseConfigured()
    ? await User.findOne({ email: normalizedEmail }).lean()
    : users.find((entry) => entry.email.toLowerCase() === normalizedEmail)
  const storedPassword = user?.password || ''
  const isHashedPassword = /^\$2[aby]\$/.test(storedPassword)
  const passwordMatches = isHashedPassword
    ? await bcrypt.compare(String(password || ''), storedPassword)
    : storedPassword === password
  if (!user || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  if (user.status === 'Inactive') {
    return res.status(403).json({ message: 'This account is inactive. Contact an administrator.' })
  }

  const effectiveRole = user.role === 'Faculty' ? 'Mentor' : user.role
  const requestedRole = String(role || '').toLowerCase()
  if (requestedRole && ![effectiveRole.toLowerCase(), user.role.toLowerCase()].includes(requestedRole)) {
    return res.status(403).json({ message: 'Selected role does not match the account.' })
  }

  if (!isHashedPassword) {
    const hashedPassword = await bcrypt.hash(String(password), 12)
    if (isDatabaseConfigured()) {
      await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } })
    } else {
      user.password = hashedPassword
    }
  }

  const token = jwt.sign({
    id: user.id || user._id.toString(),
    email: user.email,
    role: effectiveRole,
    studentId: user.studentId || null
  }, getJwtSecret(), {
    expiresIn: '8h'
  })

  return res.json({
    token,
    user: {
      id: user.id || user._id.toString(),
      name: user.name,
      email: user.email,
      role: effectiveRole,
      studentId: user.studentId || null
    }
  })
}
