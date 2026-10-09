import {
  AcademicRecord,
  Attendance,
  Engagement,
  FeeRecord,
  Feedback,
  Intervention,
  LMSActivity,
  RiskAssessment,
  Student,
  StudyProgress,
  SubjectFeedback,
  User
} from '../models/index.js'
import { dbState, users } from '../services/demoDataService.js'
import { isDatabaseConfigured } from '../services/databaseService.js'
import { buildRiskIntelligence, summarizeRiskIntelligence } from '../services/riskIntelligenceService.js'

function resolveDemoStudentId(user) {
  return user.studentId || users.find((entry) => entry.id === user.id || entry.email === user.email)?.studentId || null
}

async function resolveStudentId(user) {
  const resolved = resolveDemoStudentId(user)
  if (resolved || !isDatabaseConfigured()) return resolved
  const record = await User.findOne({ email: user.email }).select('studentId').lean()
  return record?.studentId || null
}

async function loadRiskData(studentId) {
  if (!isDatabaseConfigured()) {
    const students = studentId
      ? dbState.students.filter((student) => student.studentId === studentId)
      : dbState.students
    return {
      students,
      feedback: dbState.subjectFeedback,
      mentorFeedback: dbState.feedback || [],
      fees: [],
      interventions: dbState.interventions,
      studyProgress: dbState.studyProgress,
      snapshots: dbState.riskAssessments || []
    }
  }

  const studentFilter = studentId ? { studentId } : {}
  const [students, feedback, mentorFeedback, fees, interventions, studyProgress, snapshots] = await Promise.all([
    Student.find(studentFilter).lean(),
    SubjectFeedback.find(studentFilter).sort({ createdAt: -1 }).lean(),
    Feedback.find(studentFilter).sort({ createdAt: -1 }).lean(),
    FeeRecord.find(studentFilter).lean(),
    Intervention.find(studentFilter).sort({ createdAt: -1 }).lean(),
    StudyProgress.find(studentFilter).sort({ createdAt: -1 }).lean(),
    RiskAssessment.find(studentFilter).sort({ assessedAt: -1, createdAt: -1 }).lean()
  ])
  const ids = students.map((student) => student.studentId)
  if (!ids.length || studentId) {
    const attendanceFilter = studentId ? { studentId } : { studentId: { $in: ids } }
    const academicFilter = studentId ? { studentId } : { studentId: { $in: ids } }
    const engagementFilter = studentId ? { studentId } : { studentId: { $in: ids } }
    const lmsFilter = studentId ? { studentId } : { studentId: { $in: ids } }
    const [attendanceRecords, academicRecords, engagementRecords, lmsRecords] = await Promise.all([
      Attendance.find(attendanceFilter).sort({ updatedAt: -1 }).lean(),
      AcademicRecord.find(academicFilter).sort({ semester: -1, updatedAt: -1 }).lean(),
      Engagement.find(engagementFilter).sort({ updatedAt: -1 }).lean(),
      LMSActivity.find(lmsFilter).sort({ updatedAt: -1 }).lean()
    ])
    const latestByStudent = (records) => {
      const result = new Map()
      for (const record of records) {
        if (!result.has(record.studentId)) result.set(record.studentId, record)
      }
      return result
    }
    const attendanceByStudent = latestByStudent(attendanceRecords)
    const academicByStudent = latestByStudent(academicRecords)
    const engagementByStudent = latestByStudent(engagementRecords)
    const lmsByStudent = latestByStudent(lmsRecords)
    for (const student of students) {
      const attendance = attendanceByStudent.get(student.studentId)
      const academic = academicByStudent.get(student.studentId)
      const engagement = engagementByStudent.get(student.studentId)
      const lms = lmsByStudent.get(student.studentId)
      if (student.attendance == null && attendance?.overallAttendance != null) student.attendance = attendance.overallAttendance
      if ((!student.subjectAttendance || !student.subjectAttendance.length) && attendance?.subjectAttendance) student.subjectAttendance = attendance.subjectAttendance
      if (attendance?.monthlyTrend?.length >= 2) {
        const values = attendance.monthlyTrend.map((item) => Number(item.percentage)).filter(Number.isFinite)
        if (values.length >= 2) {
          const difference = values.at(-1) - values[0]
          const direction = difference < -3 ? 'DECLINING' : difference > 3 ? 'IMPROVING' : 'STABLE'
          student.trend = { ...student.trend, attendance: direction }
        }
      }
      if ((!student.subjectScores || !student.subjectScores.length) && academic?.subjectScores) student.subjectScores = academic.subjectScores
      if (student.academicPerformance == null && academic?.internalAssessment != null) {
        student.academicPerformance = academic.internalAssessment
      }
      const studentAcademicHistory = academicRecords.filter((record) => record.studentId === student.studentId)
      if (studentAcademicHistory.length >= 2) {
        const getRecordScore = (record) => {
          const subjectScores = (record.subjectScores || [])
            .map((item) => Number(item.currentScore ?? item.score))
            .filter(Number.isFinite)
          if (subjectScores.length) return subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length
          return Number.isFinite(Number(record.cgpa)) ? Number(record.cgpa) * 10 : null
        }
        const latest = getRecordScore(studentAcademicHistory[0])
        const previous = getRecordScore(studentAcademicHistory[1])
        if (latest !== null && previous !== null) {
          student.trend = {
            ...student.trend,
            academic: latest < previous - 3 ? 'DECLINING' : latest > previous + 3 ? 'IMPROVING' : 'STABLE'
          }
        }
      }
      if (student.academicPerformance == null && academic?.subjectScores?.length) {
        const scores = academic.subjectScores.map((item) => Number(item.currentScore ?? item.score)).filter(Number.isFinite)
        if (scores.length) student.academicPerformance = scores.reduce((sum, score) => sum + score, 0) / scores.length
      }
      if (student.assignmentCompletion == null && lms?.assignmentsCompleted != null) {
        const completed = Number(lms.assignmentsCompleted)
        const missed = Number(lms.assignmentsMissed || 0)
        if (completed + missed > 0) student.assignmentCompletion = completed / (completed + missed) * 100
      }
      if (student.assignmentMissed == null && lms?.assignmentsMissed != null) student.assignmentMissed = lms.assignmentsMissed
      if (student.engagementScore == null && engagement?.engagementScore != null) student.engagementScore = engagement.engagementScore
      if (student.lmsActivity == null && lms?.courseProgress != null) student.lmsActivity = lms.courseProgress
    }
  }
  return { students, feedback, mentorFeedback, fees, interventions, studyProgress, snapshots }
}

function belongsToStudent(record, studentId) {
  return String(record.studentId || record.student || '') === String(studentId)
}

function buildAssessments(data) {
  const today = new Date().toISOString().slice(0, 10)
  return data.students.map((student) => {
    const studentId = student.studentId
    return buildRiskIntelligence(student, {
      feedback: [
        ...data.feedback.filter((item) => belongsToStudent(item, studentId)),
        ...data.mentorFeedback.filter((item) => belongsToStudent(item, studentId))
      ],
      fee: data.fees.find((item) => belongsToStudent(item, studentId)) || null,
      interventions: data.interventions.filter((item) => belongsToStudent(item, studentId)),
      studyProgress: data.studyProgress.filter((item) => belongsToStudent(item, studentId)),
      history: data.snapshots.filter((item) =>
        belongsToStudent(item, studentId) &&
        item.riskScore != null &&
        (item.assessedDay ? item.assessedDay < today : new Date(item.assessedAt || item.createdAt) < new Date(`${today}T00:00:00.000Z`))
      )
    })
  })
}

export async function getRiskIntelligence(req, res) {
  const studentId = req.user.role === 'Student' ? await resolveStudentId(req.user) : null
  if (req.user.role === 'Student' && !studentId) {
    return res.status(404).json({ message: 'Your student record could not be found.' })
  }

  const data = await loadRiskData(studentId)
  if (studentId && !data.students.length) {
    return res.status(404).json({ message: 'Your student record could not be found.' })
  }
  const assessments = buildAssessments(data).sort((left, right) =>
    (right.riskScore ?? -1) - (left.riskScore ?? -1)
  )
  return res.json({
    view: req.user.role === 'Student' ? 'student' : req.user.role.toLowerCase(),
    assessments,
    summary: req.user.role === 'Admin' ? summarizeRiskIntelligence(assessments) : null
  })
}

export async function recordRiskAssessment(req, res) {
  const requestedStudentId = String(req.params.studentId || '').trim().toUpperCase()
  const ownStudentId = req.user.role === 'Student' ? await resolveStudentId(req.user) : null
  if (req.user.role === 'Student' && (!ownStudentId || requestedStudentId !== ownStudentId.toUpperCase())) {
    return res.status(403).json({ message: 'You can record assessments only for your own student profile.' })
  }
  if (!requestedStudentId) return res.status(400).json({ message: 'A student ID is required.' })

  const data = await loadRiskData(requestedStudentId)
  if (!data.students.length) return res.status(404).json({ message: 'Student not found.' })
  const assessment = buildAssessments(data)[0]
  if (assessment.riskScore === null) {
    return res.status(422).json({ message: 'There is not enough current student data to calculate a risk score.' })
  }

  const now = new Date()
  const assessedDay = now.toISOString().slice(0, 10)
  const snapshot = {
    studentId: requestedStudentId,
    assessedDay,
    assessedAt: now,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    categoryRisks: assessment.categories,
    factors: assessment.contributors,
    reasons: assessment.reasons,
    dataCoverage: assessment.dataCoverage,
    assessedBy: req.user.email
  }
  if (isDatabaseConfigured()) {
    await RiskAssessment.findOneAndUpdate(
      { studentId: requestedStudentId, assessedDay },
      { $set: snapshot },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
  } else {
    dbState.riskAssessments ||= []
    const index = dbState.riskAssessments.findIndex((item) =>
      item.studentId === requestedStudentId && item.assessedDay === assessedDay
    )
    if (index >= 0) dbState.riskAssessments[index] = { ...dbState.riskAssessments[index], ...snapshot }
    else dbState.riskAssessments.push(snapshot)
  }
  return res.status(201).json({ assessment: snapshot })
}
