import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEarlySuccessAssessment } from '../services/earlySuccessService.js'

test('detects an early multi-signal warning before a student fails', () => {
  const assessment = buildEarlySuccessAssessment({
    studentId: 'STU1000',
    name: 'Ramya',
    attendance: 68,
    academicPerformance: 58,
    trend: { attendance: 'STABLE', academic: 'STABLE' },
    subjectScores: [{ subject: 'Mathematics', currentScore: 58, previousExamScore: 74 }],
    pendingAssignments: [
      { subject: 'Mathematics', title: 'Assignment 1', status: 'Pending' },
      { subject: 'Physics', title: 'Assignment 2', status: 'In Progress' }
    ]
  }, {
    previousAttendance: 81,
    previousAcademicScore: 74
  })

  assert.equal(assessment.priority, 'Attention')
  assert.equal(assessment.academicRisk, 'Moderate')
  assert.equal(assessment.trend, 'Increasing')
  assert.equal(assessment.attendance, 68)
  assert.equal(assessment.pendingAssignments, 2)
  assert.deepEqual(assessment.signals.map((signal) => signal.key), ['attendance', 'academic', 'assignments'])
  assert.match(assessment.prediction, /may need extra support/)
  assert.doesNotMatch(assessment.prediction, /will fail|guaranteed failure/i)
  assert.equal(assessment.plan.length, 7)
  assert.ok(assessment.recommendations.length >= 3)
})

test('leaves missing signals unknown and does not alert from one isolated measure', () => {
  const assessment = buildEarlySuccessAssessment({
    studentId: 'STU1001',
    name: 'Student',
    attendance: 70
  })

  assert.equal(assessment.priority, 'Information')
  assert.equal(assessment.academicScore, null)
  assert.equal(assessment.previousAttendance, null)
  assert.equal(assessment.signals.length, 1)
  assert.equal(assessment.attendanceOnly, true)
  assert.equal(assessment.notification, null)
})

test('compares new checks to prior progress and adapts after improvement', () => {
  const assessment = buildEarlySuccessAssessment({
    studentId: 'STU1002',
    name: 'Student',
    attendance: 82,
    academicPerformance: 78,
    pendingAssignments: []
  }, {
    priorSnapshot: { attendance: 70, riskScore: 42 }
  })

  assert.equal(assessment.progress.attendanceChange, 12)
  assert.equal(assessment.progress.riskChange, -42)
  assert.match(assessment.adaptiveMessage, /Great progress/)
  assert.equal(assessment.priority, 'Information')
  assert.equal(assessment.notification.title, 'Progress update')
})

test('uses study plan completion and LMS assignment completion as warning signals', () => {
  const assessment = buildEarlySuccessAssessment({
    studentId: 'STU1003',
    attendance: 88,
    academicPerformance: 82
  }, {
    lmsActivity: { assignmentsCompleted: 2, assignmentsMissed: 4, courseProgress: 78 },
    studyProgress: [
      { status: 'Completed' },
      { status: 'Not Completed' },
      { status: 'Partially Completed' },
      { status: 'Not Completed' }
    ]
  })

  assert.equal(assessment.assignmentCompletion, 33.33333333333333)
  assert.equal(assessment.missedAssignments, 4)
  assert.ok(assessment.signals.some((signal) => signal.key === 'assignments'))
  assert.ok(assessment.signals.some((signal) => signal.key === 'learning'))
})
