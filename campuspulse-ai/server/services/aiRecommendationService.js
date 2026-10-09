import { calculateSuccessScore, calculateRiskLevel, calculateRiskFactors, detectTrend } from '../utils/analytics.js'

export function generateStudentInsight(student = {}) {
  const score = calculateSuccessScore(student)
  const risk = calculateRiskLevel(score)
  const factors = calculateRiskFactors(student)
  const strongest = [...factors].sort((a, b) => b.value - a.value).slice(0, 3)

  const details = strongest.map((item) => `${item.name} (${item.value}%)`).join(', ')
  const summary = `Student ${student.studentId || 'N/A'} has ${risk === 'HIGH' ? 'a high intervention priority' : risk === 'MEDIUM' ? 'an elevated risk profile' : 'a healthy trajectory'}; the largest contributors are ${details}.`

  const recommendations = []
  if ((student.attendance ?? 0) < 75) recommendations.push('Schedule faculty mentor meeting')
  if ((student.assignmentCompletion ?? 0) < 70) recommendations.push('Create attendance improvement plan')
  if ((student.placementReadiness ?? 0) < 60) recommendations.push('Assign programming fundamentals module')
  if ((student.aptitudeScore ?? 0) < 60) recommendations.push('Enroll in aptitude practice')
  recommendations.push('Review progress in 14 days')

  return {
    summary,
    priority: risk,
    factors: strongest.map((factor) => ({
      name: factor.name,
      value: factor.value,
      impact: factor.impact
    })),
    recommendations: recommendations.slice(0, 5),
    reviewAfterDays: 14,
    academicTrend: detectTrend(student.academicPerformance, student.previousAcademic ?? student.academicPerformance),
    attendanceTrend: detectTrend(student.attendance, student.previousAttendance ?? student.attendance),
    placementTrend: detectTrend(student.placementReadiness, student.previousPlacement ?? student.placementReadiness)
  }
}
