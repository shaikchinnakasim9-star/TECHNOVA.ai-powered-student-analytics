import { AcademicRecord, Student, StudyProgress, SubjectFeedback, User } from '../models/index.js'
import { dbState, users } from '../services/demoDataService.js'
import { isDatabaseConfigured } from '../services/databaseService.js'
import { getStudyTaskDetails, isStudyTaskId, recommendStudyTask } from '../services/studyPlannerService.js'

const validDurations = new Set([15, 25, 30, 45, 60])
const validStatuses = new Set(['Completed', 'Partially Completed', 'Not Completed'])

async function resolveStudentId(user) {
  if (user.studentId) return user.studentId
  const demoUser = users.find((entry) => entry.id === user.id || entry.email === user.email)
  if (demoUser?.studentId) return demoUser.studentId
  if (isDatabaseConfigured()) {
    const databaseUser = await User.findOne({ email: user.email }).select('studentId').lean()
    return databaseUser?.studentId || null
  }
  return null
}

export async function createStudyRecommendation(studentId, availableMinutes) {
  if (!validDurations.has(availableMinutes)) {
    const error = new Error('Choose a study duration of 15, 25, 45, or 60 minutes.')
    error.status = 400
    throw error
  }

  const databaseMode = isDatabaseConfigured()
  const student = databaseMode
    ? await Student.findOne({ studentId }).lean()
    : dbState.students.find((entry) => entry.studentId === studentId)

  if (!student) {
    const error = new Error('Your student record could not be found.')
    error.status = 404
    throw error
  }

  const [academicRecord, feedback, progress] = databaseMode
    ? await Promise.all([
      AcademicRecord.findOne({ studentId }).sort({ semester: -1, updatedAt: -1 }).lean(),
      SubjectFeedback.find({ studentId }).sort({ createdAt: -1 }).lean(),
      StudyProgress.find({ studentId }).sort({ createdAt: -1 }).lean()
    ])
    : [
      null,
      dbState.subjectFeedback.filter((item) => item.studentId === studentId),
      dbState.studyProgress.filter((item) => item.studentId === studentId)
    ]

  return recommendStudyTask({
    student,
    subjectScores: academicRecord?.subjectScores || [],
    feedback,
    progress,
    availableMinutes
  })
}

export async function getStudyRecommendation(req, res) {
  const availableMinutes = Number(req.body?.availableMinutes)
  if (!validDurations.has(availableMinutes)) {
    return res.status(400).json({ message: 'Choose a study duration of 15, 25, 45, or 60 minutes.' })
  }

  const studentId = await resolveStudentId(req.user)
  if (!studentId) return res.status(404).json({ message: 'Your student record could not be found.' })

  const studyTask = await createStudyRecommendation(studentId, availableMinutes)
  return res.json({
    reply: studyTask ? 'Based on your progress and the study materials, here is the most useful task to do now.' : 'You have completed all currently shared study tasks. Add more materials or update your progress to get another recommendation.',
    studyTask
  })
}

export async function recordStudyProgress(req, res) {
  const { taskId, status, availableMinutes } = req.body || {}
  const minutes = Number(availableMinutes)
  if (!isStudyTaskId(taskId)) {
    return res.status(400).json({ message: 'That study task is not recognized. Request a fresh recommendation and try again.' })
  }
  if (!validStatuses.has(status)) {
    return res.status(400).json({ message: 'Choose Completed, Partially Completed, or Not Completed.' })
  }
  if (!validDurations.has(minutes)) {
    return res.status(400).json({ message: 'Choose a study duration of 15, 25, 45, or 60 minutes.' })
  }

  const studentId = await resolveStudentId(req.user)
  if (!studentId) return res.status(404).json({ message: 'Your student record could not be found.' })

  const studentExists = isDatabaseConfigured()
    ? await Student.exists({ studentId })
    : dbState.students.some((entry) => entry.studentId === studentId)
  if (!studentExists) return res.status(404).json({ message: 'Your student record could not be found.' })

  const taskInfo = getStudyTaskDetails(taskId)
  const record = {
    studentId,
    taskId,
    topic: taskInfo.topic,
    subject: taskInfo.subject,
    status,
    availableMinutes: minutes
  }

  if (isDatabaseConfigured()) {
    await StudyProgress.create(record)
  } else {
    dbState.studyProgress.unshift({ ...record, createdAt: new Date().toISOString() })
  }

  const studyTask = await createStudyRecommendation(studentId, minutes)
  return res.json({
    reply: studyTask
      ? `Progress saved as “${status}”. Here is your next best study task.`
      : `Progress saved as “${status}”. You have completed all currently shared study tasks.`,
    studyTask
  })
}
