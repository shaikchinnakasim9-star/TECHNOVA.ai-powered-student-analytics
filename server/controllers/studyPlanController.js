import { AcademicRecord, Attendance, StudyPlan, Student, User } from '../models/index.js'
import { dbState, users } from '../services/demoDataService.js'
import { isDatabaseConfigured } from '../services/databaseService.js'
import { calculatePersonalizedStudyPlan } from '../services/studyTimeCalculator.js'

function resolveDemoStudentId(user) {
  return user.studentId || users.find((entry) => entry.id === user.id || entry.email === user.email)?.studentId || null
}

async function resolveStudentId(user) {
  const studentId = resolveDemoStudentId(user)
  if (studentId) return studentId
  if (!isDatabaseConfigured()) return null
  const record = await User.findOne({ email: user.email }).select('studentId').lean()
  return record?.studentId || null
}

function normalizeSubjects(subjects = []) {
  return subjects.map((subject) => ({
    ...subject,
    currentScore: subject.currentScore ?? subject.score,
    targetScore: subject.targetScore ?? 80,
    trend: subject.trend || 'auto',
    difficulty: subject.difficulty || 'medium',
    backlog: Boolean(subject.backlog)
  })).filter((subject) =>
    subject.subject &&
    subject.currentScore !== '' &&
    subject.currentScore != null &&
    Number.isFinite(Number(subject.currentScore)))
}

function mergeStudentCourseData(subjects, student, academic, attendanceRecord) {
  const unique = new Map()
  for (const subject of subjects) {
    const key = String(subject.subject || '').trim().toLowerCase()
    if (key) unique.set(key, { ...(unique.get(key) || {}), ...subject })
  }
  for (const item of unique.values()) {
    const name = item.subject.toLowerCase()
    const exam = student?.upcomingExams?.find((entry) => entry.subject?.toLowerCase() === name)
    const assignment = student?.pendingAssignments?.find((entry) =>
      entry.subject?.toLowerCase() === name && entry.status !== 'Completed')
    const attendance = (student?.subjectAttendance || attendanceRecord?.subjectAttendance || [])
      .find((entry) => entry.subject?.toLowerCase() === name)
    if (item.examDate == null && exam?.examDate) item.examDate = exam.examDate
    if (item.attendance == null && attendance?.percentage != null) item.attendance = attendance.percentage
    if (item.assignmentScore == null && assignment?.score != null) item.assignmentScore = assignment.score
    if (item.internalScore == null && academic?.internalAssessment != null) item.internalScore = academic.internalAssessment
    if (item.targetScore == null) item.targetScore = 80
  }
  return [...unique.values()]
}

async function getStudentSubjects(studentId) {
  if (!isDatabaseConfigured()) {
    const student = dbState.students.find((entry) => entry.studentId === studentId)
    return { student, subjects: mergeStudentCourseData(normalizeSubjects(student?.subjectScores || []), student) }
  }
  const [student, academic, attendanceRecord] = await Promise.all([
    Student.findOne({ studentId }).lean(),
    AcademicRecord.findOne({ studentId }).sort({ semester: -1, updatedAt: -1 }).lean(),
    Attendance.findOne({ studentId }).sort({ updatedAt: -1 }).lean()
  ])
  return {
    student,
    subjects: mergeStudentCourseData(normalizeSubjects([
      ...(academic?.subjectScores || []),
      ...(student?.subjectScores || [])
    ]), student, academic, attendanceRecord)
  }
}

function getSettings(saved, studentSubjects) {
  return {
    availableDailyHours: saved?.availableDailyHours ?? 3,
    placementMinutesPerDay: saved?.placementMinutesPerDay ?? 20,
    startTime: saved?.startTime || '18:00',
    subjects: saved?.subjects?.length ? saved.subjects : studentSubjects
  }
}

export async function getStudyPlanData(user) {
  const studentId = await resolveStudentId(user)
  if (!studentId) return null
  const { student, subjects: studentSubjects } = await getStudentSubjects(studentId)
  if (!student) return null

  const saved = isDatabaseConfigured()
    ? await StudyPlan.findOne({ studentId }).lean()
    : dbState.studyPlans?.find((plan) => plan.studentId === studentId)
  const settings = getSettings(saved, studentSubjects)
  let plan = null
  let message = null
  if (settings.subjects.length > 0) {
    try {
      plan = calculatePersonalizedStudyPlan(settings)
    } catch (error) {
      message = error.message
    }
  }
  return {
    studentId,
    studentName: student.name,
    settings,
    plan,
    hasSourceMarks: studentSubjects.length > 0 || Boolean(saved?.subjects?.length),
    message
  }
}

export async function getStudyPlan(req, res) {
  const data = await getStudyPlanData(req.user)
  if (!data) return res.status(404).json({ message: 'Your student record could not be found.' })
  const { studentId, studentName, ...response } = data
  return res.json(response)
}

export async function saveStudyPlan(req, res) {
  const studentId = await resolveStudentId(req.user)
  if (!studentId) return res.status(404).json({ message: 'Your student record could not be found.' })
  const { student } = await getStudentSubjects(studentId)
  if (!student) return res.status(404).json({ message: 'Your student record could not be found.' })

  const { subjects, availableDailyHours, placementMinutesPerDay, startTime } = req.body || {}
  if (!Array.isArray(subjects) || subjects.length === 0 || subjects.length > 30) {
    return res.status(400).json({ message: 'Add between 1 and 30 subjects to build a study plan.' })
  }
  const normalizedSubjects = normalizeSubjects(subjects)
  if (normalizedSubjects.length !== subjects.length) {
    return res.status(400).json({ message: 'Every subject needs a name and a current score.' })
  }

  let plan
  try {
    plan = calculatePersonalizedStudyPlan({
      subjects: normalizedSubjects,
      availableDailyHours: Number(availableDailyHours),
      placementMinutesPerDay: Number(placementMinutesPerDay),
      startTime
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }

  const settings = {
    studentId,
    availableDailyHours: Number(availableDailyHours),
    placementMinutesPerDay: Number(placementMinutesPerDay),
    startTime,
    subjects: normalizedSubjects,
    recalculatedAt: new Date()
  }
  if (isDatabaseConfigured()) {
    await StudyPlan.findOneAndUpdate({ studentId }, { $set: settings }, { upsert: true, new: true, runValidators: true })
  } else {
    dbState.studyPlans ||= []
    const index = dbState.studyPlans.findIndex((entry) => entry.studentId === studentId)
    if (index === -1) dbState.studyPlans.push(settings)
    else dbState.studyPlans[index] = settings
  }
  return res.json({ settings, plan, hasSourceMarks: true })
}