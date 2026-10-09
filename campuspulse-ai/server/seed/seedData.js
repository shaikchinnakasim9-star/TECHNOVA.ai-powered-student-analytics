import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { initializeDatabase } from '../services/databaseService.js'
import { Student, User } from '../models/index.js'

dotenv.config()

if (!process.env.MONGODB_URI?.trim()) {
  throw new Error('Set MONGODB_URI in server/.env before running the database seed command.')
}

try {
  await mongoose.connect(process.env.MONGODB_URI)
  await initializeDatabase()
  console.log('Database seed completed.')
  console.log(`Students: ${await Student.countDocuments()}`)
  console.log(`Users: ${await User.countDocuments()}`)
} finally {
  await mongoose.disconnect()
}
