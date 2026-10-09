import express from 'express'
import { getStudyPlan, saveStudyPlan } from '../controllers/studyPlanController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.use(authenticateToken, requireRole('Student'))
router.get('/', asyncHandler(getStudyPlan))
router.put('/', asyncHandler(saveStudyPlan))

export default router