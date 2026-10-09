import express from 'express'
import { getEarlySuccess, markEarlySuccessNotificationRead } from '../controllers/earlySuccessController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.use(authenticateToken, requireRole('Admin', 'Student'))
router.get('/', asyncHandler(getEarlySuccess))
router.patch('/notifications/:notificationId/read', asyncHandler(markEarlySuccessNotificationRead))

export default router
