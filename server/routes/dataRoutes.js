import express from 'express'
import { importData } from '../controllers/dataController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.post('/import', authenticateToken, requireRole('Admin'), asyncHandler(importData))

export default router
