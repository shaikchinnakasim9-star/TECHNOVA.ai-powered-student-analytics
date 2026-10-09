import express from 'express'
import { getSummary, getRiskDistributionData, getDepartmentAnalysisData, getAnalyticsTrends } from '../controllers/dashboardController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.get('/summary', authenticateToken, requireRole('Admin'), asyncHandler(getSummary))
router.get('/risk-distribution', authenticateToken, requireRole('Admin'), asyncHandler(getRiskDistributionData))
router.get('/department-analysis', authenticateToken, requireRole('Admin'), asyncHandler(getDepartmentAnalysisData))
router.get('/trends', authenticateToken, requireRole('Admin'), asyncHandler(getAnalyticsTrends))

export default router
