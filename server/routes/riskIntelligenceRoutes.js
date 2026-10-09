import express from 'express'
import { getRiskIntelligence, recordRiskAssessment } from '../controllers/riskIntelligenceController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.get('/', authenticateToken, requireRole('Admin'), asyncHandler(getRiskIntelligence))
router.post('/assessments/:studentId', authenticateToken, requireRole('Admin'), asyncHandler(recordRiskAssessment))

export default router
