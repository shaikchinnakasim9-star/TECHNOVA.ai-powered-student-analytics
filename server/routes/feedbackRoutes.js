import express from 'express'
import { createSubjectFeedback, getSubjectFeedback } from '../controllers/feedbackController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.use(authenticateToken, requireRole('Admin', 'Student'))
router.get('/', asyncHandler(getSubjectFeedback))
router.post('/', asyncHandler(createSubjectFeedback))

export default router
