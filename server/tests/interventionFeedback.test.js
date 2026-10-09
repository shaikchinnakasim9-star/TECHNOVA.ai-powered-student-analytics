import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEarlySuccessAssessment } from '../services/earlySuccessService.js'
import { buildRiskIntelligence } from '../services/riskIntelligenceService.js'

test('future early-success suggestions account for completed, reviewed interventions', () => {
  const student = {
    studentId: 'STU1000',
    attendance: 68,
    academicPerformance: 58,
    assignmentMissed: 2
  }
  const assessment = buildEarlySuccessAssessment(student, {
    interventions: [{
      riskType: 'Attendance',
      status: 'Completed',
      outcomeAssessment: 'Improved'
    }]
  })

  assert.ok(assessment.recommendations.some((item) => item.includes('recorded improved outcome')))
  assert.ok(assessment.recommendations.some((item) => item.includes('observational')))
})

test('future risk recommendations suggest an alternative after completed support did not improve', () => {
  const assessment = buildRiskIntelligence({
    studentId: 'STU1000',
    attendance: 60,
    academicPerformance: 80
  }, {
    interventions: [{
      riskType: 'Attendance',
      status: 'Completed',
      outcomeAssessment: 'Needs More Support',
      studentResponse: 'Could not attend due to transport'
    }]
  })

  const attendanceRecommendation = assessment.recommendations.find((item) => item.action.includes('alternative'))
  assert.ok(attendanceRecommendation)
  assert.equal(attendanceRecommendation.needsMoreSupportOutcomes, 1)
  assert.equal(assessment.interventions[0].effectiveness, 'Needs More Support (reported)')
})

test('incomplete or unreviewed interventions do not personalize recommendations', () => {
  const assessment = buildEarlySuccessAssessment({
    studentId: 'STU1000',
    attendance: 68,
    academicPerformance: 58,
    assignmentMissed: 2
  }, {
    interventions: [{
      riskType: 'Attendance',
      status: 'In Progress',
      outcomeAssessment: 'Not Yet Reviewed',
      riskBeforeIntervention: 75
    }]
  })

  assert.ok(assessment.recommendations.every((item) => !item.includes('recorded improved outcome') && !item.includes('different or additional')))
})
