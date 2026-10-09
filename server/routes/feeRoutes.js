import express from 'express'
import { getFeeDetails } from '../controllers/feeController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.get('/', authenticateToken, requireRole('Admin', 'Student'), asyncHandler(getFeeDetails))

export default router
