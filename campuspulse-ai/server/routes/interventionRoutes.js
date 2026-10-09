import express from 'express'
import { getInterventions, createIntervention, updateIntervention } from '../controllers/interventionController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()

router.get('/', authenticateToken, requireRole('Admin'), asyncHandler(getInterventions))
router.post('/', authenticateToken, requireRole('Admin'), asyncHandler(createIntervention))
router.patch('/:id', authenticateToken, requireRole('Admin'), asyncHandler(updateIntervention))

export default router
