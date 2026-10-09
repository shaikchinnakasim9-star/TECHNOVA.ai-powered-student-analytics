import express from 'express'
import { getStudents, getStudentById, getStudentScore, getStudentInsights, getRiskStudents, getSegments, getRiskTableData, saveStudentTechnicalSkills } from '../controllers/studentController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.get('/', authenticateToken, requireRole('Admin', 'Mentor', 'Faculty', 'Student'), asyncHandler(getStudents))
router.get('/risk', authenticateToken, requireRole('Admin'), asyncHandler(getRiskStudents))
router.get('/segments', authenticateToken, requireRole('Admin'), asyncHandler(getSegments))
router.get('/risk-table', authenticateToken, requireRole('Admin'), asyncHandler(getRiskTableData))
router.put('/:id/skills', authenticateToken, requireRole('Student'), asyncHandler(saveStudentTechnicalSkills))
router.get('/:id', authenticateToken, requireRole('Admin', 'Mentor', 'Faculty', 'Student'), asyncHandler(getStudentById))
router.get('/:id/score', authenticateToken, requireRole('Admin', 'Mentor', 'Faculty', 'Student'), asyncHandler(getStudentScore))
router.get('/:id/insights', authenticateToken, requireRole('Admin', 'Mentor', 'Faculty', 'Student'), asyncHandler(getStudentInsights))

export default router
