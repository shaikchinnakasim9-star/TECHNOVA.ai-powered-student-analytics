import { dbState, users } from '../services/demoDataService.js'
import { SubjectFeedback, Student, User } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'

const understandingLabels = {
  1: 'Not understanding',
  2: 'Need a lot of help',
  3: 'Partly understand',
  4: 'Mostly understand',
  5: 'Understand well'
}

export async function createSubjectFeedback(req, res) {
  const { subject, understanding, notes = '', studentId: requestedStudentId } = req.body || {}
  const normalizedSubject = typeof subject === 'string' ? subject.trim() : ''
  const numericUnderstanding = Number(understanding)
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : null

  if (normalizedSubject.length < 2 || normalizedSubject.length > 100) {
    return res.status(400).json({ message: 'Subject must be between 2 and 100 characters.' })
  }
  if (!Number.isInteger(numericUnderstanding) || numericUnderstanding < 1 || numericUnderstanding > 5) {
    return res.status(400).json({ message: 'Understanding must be a rating from 1 to 5.' })
  }
  if (normalizedNotes === null || normalizedNotes.length > 1000) {
    return res.status(400).json({ message: 'Additional feedback must be 1000 characters or fewer.' })
  }

  let studentId = requestedStudentId
  if (req.user.role === 'Student') {
    studentId = req.user.studentId || users.find((entry) => entry.id === req.user.id || entry.email === req.user.email)?.studentId
  }

  const studentExists = typeof studentId === 'string' && (isDatabaseConfigured()
    ? await Student.exists({ studentId })
    : dbState.students.some((student) => student.studentId === studentId))
  if (!studentExists) {
    return res.status(400).json({ message: 'Select a valid student before submitting feedback.' })
  }

  const feedback = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    subject: normalizedSubject,
    understanding: numericUnderstanding,
    understandingLabel: understandingLabels[numericUnderstanding],
    notes: normalizedNotes,
    reportedBy: req.user.email,
    createdAt: new Date().toISOString()
  }

  if (isDatabaseConfigured()) {
    const saved = await SubjectFeedback.create(feedback)
    const record = { ...saved.toObject(), id: saved._id.toString() }
    dbState.subjectFeedback.unshift(record)
    return res.status(201).json({ feedback: record })
  }

  dbState.subjectFeedback.unshift(feedback)
  return res.status(201).json({ feedback })
}

export async function getSubjectFeedback(req, res) {
  const isStudent = req.user.role === 'Student'
  const user = isStudent && !req.user.studentId && isDatabaseConfigured()
    ? await User.findOne({ email: req.user.email }).lean()
    : null
  const studentId = req.user.studentId || user?.studentId || (isStudent ? users.find((entry) => entry.id === req.user.id || entry.email === req.user.email)?.studentId : null)
  if (isStudent && !studentId) {
    return res.status(404).json({ message: 'Your student record could not be found.' })
  }

  const filter = isStudent ? { studentId } : {}
  const feedback = isDatabaseConfigured()
    ? await SubjectFeedback.find(filter).sort({ createdAt: -1 }).lean()
    : isStudent
      ? dbState.subjectFeedback.filter((entry) => entry.studentId === studentId)
      : dbState.subjectFeedback

  return res.json({ data: feedback })
}
