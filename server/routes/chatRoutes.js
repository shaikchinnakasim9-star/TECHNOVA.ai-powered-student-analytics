import express from 'express'
import { postChatMessage } from '../controllers/chatController.js'
import { getStudyRecommendation, recordStudyProgress } from '../controllers/studyController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.post('/', authenticateToken, requireRole('Admin', 'Student'), asyncHandler(postChatMessage))
router.post('/study/recommendation', authenticateToken, requireRole('Student'), asyncHandler(getStudyRecommendation))
router.post('/study/progress', authenticateToken, requireRole('Student'), asyncHandler(recordStudyProgress))

export default router
