export const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max)

export function calculateSuccessScore(student = {}) {
  const academic = clamp(student.academicPerformance ?? student.academic ?? 0)
  const attendance = clamp(student.attendance ?? 0)
  const lms = clamp(student.lmsActivity ?? 0)
  const assignments = clamp(student.assignmentCompletion ?? 0)
  const placement = clamp(student.placementReadiness ?? 0)
  const engagement = clamp(student.engagement ?? 0)
  const skills = clamp(student.skills ?? 0)

  const score =
    academic * 0.3 +
    attendance * 0.2 +
    lms * 0.15 +
    assignments * 0.1 +
    placement * 0.15 +
    engagement * 0.05 +
    skills * 0.05

  return Number(score.toFixed(1))
}

export function calculateRiskLevel(score) {
  if (score >= 80) return 'LOW'
  if (score >= 60) return 'MEDIUM'
  return 'HIGH'
}

export function calculateRiskFactors(student = {}) {
  const factors = []
  if ((student.attendance ?? 0) < 75) factors.push({ name: 'Attendance', value: clamp(100 - student.attendance), impact: 'High' })
  if ((student.assignmentCompletion ?? 0) < 70) factors.push({ name: 'Assignment Completion', value: clamp(100 - student.assignmentCompletion), impact: 'High' })
  if ((student.placementReadiness ?? 0) < 60) factors.push({ name: 'Placement Readiness', value: clamp(100 - student.placementReadiness), impact: 'Medium' })
  if ((student.lmsActivity ?? 0) < 70) factors.push({ name: 'LMS Activity', value: clamp(100 - student.lmsActivity), impact: 'Medium' })
  if ((student.academicPerformance ?? 0) < 65) factors.push({ name: 'Academic Performance', value: clamp(100 - student.academicPerformance), impact: 'Medium' })
  return factors.length ? factors : [{ name: 'Academic Performance', value: 18, impact: 'Low' }]
}

export function calculatePlacementReadiness(student = {}) {
  const aptitude = clamp(student.aptitudeScore ?? 0)
  const coding = clamp(student.codingScore ?? 0)
  const communication = clamp(student.communicationScore ?? 0)
  const mockInterview = clamp(student.mockInterviewScore ?? 0)
  const resume = clamp(student.resumeScore ?? 0)

  return Number(((aptitude + coding + communication + mockInterview + resume) / 5).toFixed(1))
}

export function calculateEngagementScore(student = {}) {
  const hackathons = clamp(student.hackathons ?? 0)
  const clubs = clamp(student.clubs ?? 0)
  const events = clamp(student.events ?? 0)
  const certifications = clamp(student.certifications ?? 0)
  const workshops = clamp(student.workshops ?? 0)
  const projects = clamp(student.projects ?? 0)

  return Number(((hackathons + clubs + events + certifications + workshops + projects) / 6).toFixed(1))
}

export function detectTrend(current, previous) {
  if (typeof current !== 'number' || typeof previous !== 'number') return 'STABLE'
  if (current > previous + 3) return 'IMPROVING'
  if (current < previous - 3) return 'DECLINING'
  return 'STABLE'
}

export function generateRecommendation(student = {}) {
  const score = calculateSuccessScore(student)
  const risk = calculateRiskLevel(score)

  const factors = []
  if ((student.attendance ?? 0) < 75) factors.push('Attendance improvement plan')
  if ((student.assignmentCompletion ?? 0) < 70) factors.push('Assignment completion support')
  if ((student.placementReadiness ?? 0) < 60) factors.push('Placement aptitude training')
  if ((student.lmsActivity ?? 0) < 70) factors.push('Learning management engagement support')

  const actions = factors.length ? factors : ['Faculty mentoring', 'Progress review']
  return {
    priority: risk === 'HIGH' ? 'HIGH' : risk === 'MEDIUM' ? 'MEDIUM' : 'LOW',
    summary: risk === 'HIGH' ? 'Student requires targeted intervention.' : 'Student is trending toward a stable but monitorable trajectory.',
    factors: actions,
    recommendations: actions.slice(0, 4),
    reviewAfterDays: risk === 'HIGH' ? 14 : 21,
    riskLabel: risk
  }
}

export function buildStudentProfile(student = {}) {
  const successScore = calculateSuccessScore(student)
  const riskLevel = calculateRiskLevel(successScore)
  const place = calculatePlacementReadiness(student)
  const engagement = calculateEngagementScore(student)
  const riskFactors = calculateRiskFactors(student)

  return {
    ...student,
    successScore,
    riskLevel,
    placementReadiness: place,
    engagementScore: engagement,
    riskFactors,
    recommendation: generateRecommendation(student)
  }
}
