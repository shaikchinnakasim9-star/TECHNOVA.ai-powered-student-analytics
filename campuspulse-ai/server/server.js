import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { initializeDatabase, isDatabaseConfigured } from './services/databaseService.js'
import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import interventionRoutes from './routes/interventionRoutes.js'
import dataRoutes from './routes/dataRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import feedbackRoutes from './routes/feedbackRoutes.js'
import feeRoutes from './routes/feeRoutes.js'
import studyPlanRoutes from './routes/studyPlanRoutes.js'
import riskIntelligenceRoutes from './routes/riskIntelligenceRoutes.js'
import earlySuccessRoutes from './routes/earlySuccessRoutes.js'
import roleManagementRoutes from './routes/roleManagementRoutes.js'
import { authenticateToken, requireRole } from './middleware/auth.js'
import { notFoundHandler, errorHandler } from './middleware/error.js'
import { getRiskStudents, getSegments } from './controllers/studentController.js'
import { asyncHandler } from './middleware/asyncHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  const database = mongoose.connection.readyState === 1
    ? 'connected'
    : isDatabaseConfigured() ? 'disconnected' : 'demo'
  res.status(database === 'disconnected' ? 503 : 200).json({
    status: database === 'disconnected' ? 'error' : 'ok',
    database,
    message: 'CampusPulse AI API is running.'
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/interventions', interventionRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/fees', feeRoutes)
app.use('/api/study-plan', studyPlanRoutes)
app.use('/api/risk-intelligence', riskIntelligenceRoutes)
app.use('/api/early-success', earlySuccessRoutes)
app.use('/api/management', roleManagementRoutes)
app.get('/api/risk', authenticateToken, requireRole('Admin'), asyncHandler(getRiskStudents))
app.get('/api/segments', authenticateToken, requireRole('Admin'), asyncHandler(getSegments))

app.use(notFoundHandler)
app.use(errorHandler)

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri?.trim()) {
    console.log('MongoDB URI not configured. Running in demo in-memory mode.')
    return
  }

  try {
    await mongoose.connect(mongoUri)
    await initializeDatabase()
    console.log('MongoDB connected successfully.')
  } catch (error) {
    console.error('MongoDB connection or initialization failed:', error.message)
    throw error
  }
}

async function startServer() {
  await connectDatabase()
  app.listen(PORT, () => {
    console.log(`CampusPulse AI server running on http://localhost:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Server startup failed.')
  process.exitCode = 1
})
