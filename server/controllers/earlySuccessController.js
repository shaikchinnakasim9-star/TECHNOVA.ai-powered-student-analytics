import {
  AcademicRecord,
  Attendance,
  CampusNotification,
  EarlySuccessCheck,
  EarlySuccessNotification,
  Feedback,
  Intervention,
  LMSActivity,
  Student,
  StudyProgress,
  SubjectFeedback,
  User
} from '../models/index.js'
import { dbState, users } from '../services/demoDataService.js'
import { isDatabaseConfigured } from '../services/databaseService.js'
import { buildEarlySuccessAssessment } from '../services/earlySuccessService.js'

function resolveDemoStudentId(user) {
  return user.studentId || users.find((entry) => entry.id === user.id || entry.email === user.email)?.studentId || null
}

async function resolveStudentId(user) {
  const demoId = resolveDemoStudentId(user)
  if (demoId || !isDatabaseConfigured()) return demoId
  const record = await User.findOne({ email: user.email }).select('studentId').lean()
  return record?.studentId || null
}

function academicAverage(record) {
  const scores = (record?.subjectScores || [])
    .map((subject) => Number(subject.currentScore ?? subject.internalScore ?? subject.score))
    .filter(Number.isFinite)
  if (scores.length) return scores.reduce((sum, score) => sum + score, 0) / scores.length
  const cgpa = record?.cgpa == null ? null : Number(record.cgpa)
  return Number.isFinite(cgpa) ? cgpa * 10 : null
}

async function loadStudentContext(studentId) {
  if (!isDatabaseConfigured()) {
    const student = dbState.students.find((item) => item.studentId === studentId)
    if (!student) return null
    return {
      student,
      context: {
        subjectFeedback: (dbState.subjectFeedback || []).filter((item) => item.studentId === studentId),
        facultyFeedback: (dbState.feedback || []).filter((item) => item.studentId === studentId),
        studyProgress: (dbState.studyProgress || []).filter((item) => item.studentId === studentId),
        interventions: (dbState.interventions || []).filter((item) => String(item.studentId || item.student) === studentId)
      }
    }
  }

  const student = await Student.findOne({ studentId }).lean()
  if (!student) return null
  const [attendanceRecords, academicRecords, lmsRecords, subjectFeedback, facultyFeedback, studyProgress, interventions] = await Promise.all([
    Attendance.find({ studentId }).sort({ updatedAt: -1 }).limit(2).lean(),
    AcademicRecord.find({ studentId }).sort({ updatedAt: -1 }).limit(3).lean(),
    LMSActivity.find({ studentId }).sort({ updatedAt: -1 }).limit(2).lean(),
    SubjectFeedback.find({ studentId }).sort({ createdAt: -1 }).limit(20).lean(),
    Feedback.find({ studentId }).sort({ createdAt: -1 }).limit(10).lean(),
    StudyProgress.find({ studentId }).sort({ createdAt: -1 }).limit(14).lean(),
    Intervention.find({ studentId }).sort({ createdAt: -1 }).limit(10).lean()
  ])
  const latestAttendance = attendanceRecords[0]
  const latestAcademic = academicRecords[0]
  const previousAcademic = academicRecords[1]
  const latestLms = lmsRecords[0]

  if (student.attendance == null && latestAttendance?.overallAttendance != null) {
    student.attendance = latestAttendance.overallAttendance
  }
  if ((!student.subjectScores || !student.subjectScores.length) && latestAcademic?.subjectScores?.length) {
    student.subjectScores = latestAcademic.subjectScores
  }
  if (student.academicPerformance == null && latestAcademic) {
    student.academicPerformance = latestAcademic.internalAssessment ?? academicAverage(latestAcademic)
  }
  if (student.lmsActivity == null && latestLms?.courseProgress != null) {
    student.lmsActivity = latestLms.courseProgress
  }
  if (student.assignmentMissed == null && latestLms?.assignmentsMissed != null) {
    student.assignmentMissed = latestLms.assignmentsMissed
  }

  return {
    student,
    context: {
      attendance: latestAttendance,
      previousAttendance: attendanceRecords[1]?.overallAttendance,
      previousAcademicScore: academicAverage(previousAcademic),
      previousLmsActivity: lmsRecords[1]?.courseProgress,
      lmsActivity: latestLms,
      subjectFeedback,
      facultyFeedback,
      studyProgress,
      interventions
    }
  }
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

async function persistCheck(studentId, assessment) {
  const dateKey = getDateKey()
  const check = {
    studentId,
    dateKey,
    riskScore: assessment.riskScore,
    priority: assessment.priority,
    attendance: assessment.attendance,
    academicScore: assessment.academicScore,
    previousAcademicScore: assessment.previousAcademicScore,
    pendingAssignments: assessment.pendingAssignments,
    signals: assessment.signals,
    trend: assessment.trend,
    assessedAt: new Date()
  }

  if (isDatabaseConfigured()) {
    await EarlySuccessCheck.findOneAndUpdate(
      { studentId, dateKey },
      { $set: check },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
    return
  }
  dbState.earlySuccessChecks ||= []
  const index = dbState.earlySuccessChecks.findIndex((item) => item.studentId === studentId && item.dateKey === dateKey)
  if (index >= 0) dbState.earlySuccessChecks[index] = { ...dbState.earlySuccessChecks[index], ...check }
  else dbState.earlySuccessChecks.push(check)
}

async function createNotification(studentId, student, assessment) {
  if (!assessment.notification) return null
  let previous
  if (isDatabaseConfigured()) {
    previous = await EarlySuccessNotification.findOne({ studentId }).sort({ createdAt: -1 }).lean()
  } else {
    previous = (dbState.earlySuccessNotifications || [])
      .filter((item) => item.studentId === studentId)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0]
  }
  if (previous?.signature === assessment.signature) return previous

  const notification = {
    studentId,
    priority: assessment.priority,
    title: assessment.notification.title,
    message: assessment.notification.message,
    reasons: assessment.notification.reasons,
    signature: assessment.signature,
    status: 'Unread',
    createdAt: new Date()
  }
  const saved = isDatabaseConfigured()
    ? await EarlySuccessNotification.create(notification)
    : { ...notification, id: `early-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
  if (!isDatabaseConfigured()) {
    dbState.earlySuccessNotifications ||= []
    dbState.earlySuccessNotifications.push(saved)
  }
  if (student?.mentorId) {
    const mentorNotification = {
      recipientId: String(student.mentorId),
      studentId,
      title: 'Assigned student may need support',
      message: `${student.name || studentId}: ${assessment.notification.message}`,
      type: 'system',
      priority: assessment.priority
    }
    if (isDatabaseConfigured()) {
      await CampusNotification.create(mentorNotification)
    } else {
      dbState.notifications.unshift({
        ...mentorNotification,
        id: `mentor-alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        readAt: null
      })
    }
  }
  return saved
}

export async function getEarlySuccess(req, res) {
  const ownStudentId = req.user.role === 'Student' ? await resolveStudentId(req.user) : null
  if (req.user.role === 'Student' && !ownStudentId) {
    return res.status(404).json({ message: 'Your student record could not be found.' })
  }
  const requestedStudentId = String(req.query.studentId || ownStudentId || '').trim().toUpperCase()
  if (!requestedStudentId) {
    return res.status(400).json({ message: 'Provide a student ID to view an early success assessment.' })
  }
  if (req.user.role === 'Student' && requestedStudentId !== ownStudentId.toUpperCase()) {
    return res.status(403).json({ message: 'You can view early success alerts only for your own profile.' })
  }

  const loaded = await loadStudentContext(requestedStudentId)
  if (!loaded) return res.status(404).json({ message: 'Student not found.' })

  let priorSnapshot
  if (isDatabaseConfigured()) {
    priorSnapshot = await EarlySuccessCheck.findOne({ studentId: requestedStudentId, dateKey: { $lt: getDateKey() } })
      .sort({ dateKey: -1 })
      .lean()
  } else {
    priorSnapshot = (dbState.earlySuccessChecks || [])
      .filter((item) => item.studentId === requestedStudentId && item.dateKey < getDateKey())
      .sort((left, right) => right.dateKey.localeCompare(left.dateKey))[0]
  }

  const assessment = buildEarlySuccessAssessment(loaded.student, { ...loaded.context, priorSnapshot })
  await persistCheck(requestedStudentId, assessment)
  await createNotification(requestedStudentId, loaded.student, assessment)

  let checks
  let notifications
  let interventionHistory = loaded.context.interventions
    .slice()
    .sort((left, right) => new Date(right.createdDate || right.createdAt || 0) - new Date(left.createdDate || left.createdAt || 0))
    .slice(0, 10)
  if (isDatabaseConfigured()) {
    [checks, notifications] = await Promise.all([
      EarlySuccessCheck.find({ studentId: requestedStudentId }).sort({ dateKey: -1 }).limit(14).lean(),
      EarlySuccessNotification.find({ studentId: requestedStudentId }).sort({ createdAt: -1 }).limit(10).lean()
    ])
  } else {
    checks = (dbState.earlySuccessChecks || [])
      .filter((item) => item.studentId === requestedStudentId)
      .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
      .slice(0, 14)
    notifications = (dbState.earlySuccessNotifications || [])
      .filter((item) => item.studentId === requestedStudentId)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 10)
  }

  const before = checks.find((item) => item.dateKey !== getDateKey())
  if (before && !assessment.progress) {
    assessment.progress = {
      previous: { attendance: before.attendance ?? null, riskScore: before.riskScore ?? null },
      attendanceChange: assessment.attendance != null && before.attendance != null
        ? Number((assessment.attendance - before.attendance).toFixed(1))
        : null,
      riskChange: before.riskScore != null ? Number((assessment.riskScore - before.riskScore).toFixed(1)) : null
    }
  }
  assessment.adaptiveMessage = assessment.progress?.riskChange <= -5
    ? 'Great progress! Your recent indicators have improved compared with the previous check. Keep following your current study plan.'
    : assessment.priority !== 'Information' && before
      ? 'Your recent indicators still suggest a check-in may help. Consider speaking with your faculty mentor about additional support.'
      : null

  return res.json({
    assessment,
    progressHistory: checks.slice().reverse(),
    notifications,
    interventionHistory
  })
}

export async function markEarlySuccessNotificationRead(req, res) {
  const studentId = req.user.role === 'Student' ? await resolveStudentId(req.user) : req.body?.studentId
  if (!studentId) return res.status(404).json({ message: 'Student record could not be found.' })

  if (isDatabaseConfigured()) {
    const notification = await EarlySuccessNotification.findOneAndUpdate(
      { _id: req.params.notificationId, studentId },
      { $set: { status: 'Read' } },
      { new: true, runValidators: true }
    ).lean()
    if (!notification) return res.status(404).json({ message: 'Notification not found.' })
    return res.json({ notification })
  }
  const notification = (dbState.earlySuccessNotifications || []).find((item) =>
    String(item.id || item._id) === req.params.notificationId && item.studentId === studentId
  )
  if (!notification) return res.status(404).json({ message: 'Notification not found.' })
  notification.status = 'Read'
  return res.json({ notification })
}
