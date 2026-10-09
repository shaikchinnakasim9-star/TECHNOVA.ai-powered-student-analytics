import express from 'express'
import {
  createAnnouncement,
  createEvent,
  createMentor,
  createMentorRecord,
  createStudent,
  deactivateMentor,
  deactivateStudent,
  deleteEvent,
  getAnnouncements,
  getChatbotConfig,
  getEvents,
  getEventRegistrations,
  getMyEventRegistrations,
  getMentorRecords,
  getMentorStudents,
  getMyMentor,
  getNotifications,
  getPlatformSettings,
  getStaffAudienceOptions,
  listMentors,
  listStudents,
  markNotificationRead,
  registerForEvent,
  cancelEventRegistration,
  updateEvent,
  updateMentor,
  updateMentorRecord,
  updatePlatformSettings,
  updateStudent
} from '../controllers/roleManagementController.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = express.Router()
const staffRoles = requireRole('Admin', 'Mentor', 'Faculty')

router.get('/students', authenticateToken, staffRoles, asyncHandler(listStudents))
router.post('/students', authenticateToken, requireRole('Admin'), asyncHandler(createStudent))
router.patch('/students/:id', authenticateToken, requireRole('Admin'), asyncHandler(updateStudent))
router.delete('/students/:id', authenticateToken, requireRole('Admin'), asyncHandler(deactivateStudent))

router.get('/mentors', authenticateToken, requireRole('Admin'), asyncHandler(listMentors))
router.post('/mentors', authenticateToken, requireRole('Admin'), asyncHandler(createMentor))
router.patch('/mentors/:id', authenticateToken, requireRole('Admin'), asyncHandler(updateMentor))
router.delete('/mentors/:id', authenticateToken, requireRole('Admin'), asyncHandler(deactivateMentor))

router.get('/events', authenticateToken, requireRole('Admin', 'Mentor', 'Faculty', 'Student'), asyncHandler(getEvents))
router.post('/events', authenticateToken, requireRole('Admin'), asyncHandler(createEvent))
router.put('/events/:id', authenticateToken, requireRole('Admin'), asyncHandler(updateEvent))
router.delete('/events/:id', authenticateToken, requireRole('Admin'), asyncHandler(deleteEvent))
router.get('/events/registrations/mine', authenticateToken, requireRole('Student'), asyncHandler(getMyEventRegistrations))
router.get('/events/:id/registrations', authenticateToken, requireRole('Admin'), asyncHandler(getEventRegistrations))
router.post('/events/:id/register', authenticateToken, requireRole('Student'), asyncHandler(registerForEvent))
router.delete('/events/:id/register', authenticateToken, requireRole('Student'), asyncHandler(cancelEventRegistration))

router.get('/announcements', authenticateToken, requireRole('Admin', 'Mentor', 'Faculty', 'Student'), asyncHandler(getAnnouncements))
router.post('/announcements', authenticateToken, requireRole('Admin'), asyncHandler(createAnnouncement))
router.get('/audience-options', authenticateToken, requireRole('Admin'), asyncHandler(getStaffAudienceOptions))
router.get('/chatbot', authenticateToken, requireRole('Admin', 'Mentor', 'Faculty', 'Student'), asyncHandler(getChatbotConfig))
router.get('/settings', authenticateToken, requireRole('Admin'), asyncHandler(getPlatformSettings))
router.patch('/settings', authenticateToken, requireRole('Admin'), asyncHandler(updatePlatformSettings))

router.get('/notifications', authenticateToken, asyncHandler(getNotifications))
router.patch('/notifications/:id/read', authenticateToken, asyncHandler(markNotificationRead))

router.get('/my-mentor', authenticateToken, requireRole('Student'), asyncHandler(getMyMentor))

router.get('/mentoring/students', authenticateToken, requireRole('Mentor', 'Faculty'), asyncHandler(getMentorStudents))
router.get('/mentoring/students/:studentId/records', authenticateToken, requireRole('Mentor', 'Faculty', 'Student'), asyncHandler(getMentorRecords))
router.post('/mentoring/students/:studentId/records', authenticateToken, requireRole('Mentor', 'Faculty', 'Student'), asyncHandler(createMentorRecord))
router.patch('/mentoring/records/:id', authenticateToken, requireRole('Mentor', 'Faculty', 'Student'), asyncHandler(updateMentorRecord))

export default router
