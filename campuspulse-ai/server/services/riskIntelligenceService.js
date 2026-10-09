const CATEGORY_WEIGHTS = {
  academic: 0.28,
  attendance: 0.2,
  assignments: 0.16,
  engagement: 0.1,
  learning: 0.13,
  administrative: 0.05,
  performanceTrend: 0.08
}

const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value))

function numeric(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function average(values) {
  const usable = values.map(numeric).filter((value) => value !== null)
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null
}

function trendName(value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('declin') || normalized.includes('decreas')) return 'declining'
  if (normalized.includes('improv') || normalized.includes('increas')) return 'improving'
  if (normalized.includes('stable') || normalized.includes('maintain')) return 'stable'
  return null
}

function getAcademicScore(student) {
  const profileScore = numeric(student.academicPerformance)
  if (profileScore !== null) return profileScore
  return average((student.subjectScores || []).map((subject) =>
    subject.currentScore ?? subject.score ?? subject.marks
  ))
}

function getAttendanceScore(student) {
  const profileScore = numeric(student.attendance)
  if (profileScore !== null) return profileScore
  return average((student.subjectAttendance || []).map((item) => item.percentage))
}

function getAssignmentRisk(student) {
  const completion = numeric(student.assignmentCompletion)
  const missed = numeric(student.assignmentMissed ?? student.assignmentsMissed)
  const pending = (student.pendingAssignments || []).filter((assignment) =>
    String(assignment.status || 'Pending').toLowerCase() !== 'completed'
  ).length
  if (completion === null && missed === null && pending === 0) {
    return (student.pendingAssignments || []).length ? 0 : null
  }
  const completionRisk = completion === null ? 0 : 100 - clamp(completion)
  return clamp(Math.max(completionRisk, Math.min(100, (missed || 0) * 12 + pending * 20)))
}

function getLearningRisk(student, feedback = [], studyProgress = []) {
  const learningSignals = [
    numeric(student.courseProgress),
    numeric(student.lmsActivity),
    ...feedback.map((item) => {
      const understanding = numeric(item.understanding)
      return understanding === null ? null : ((understanding - 1) / 4) * 100
    }),
    ...feedback.map((item) => {
      const morale = numeric(item.moraleScore)
      return morale === null ? null : morale
    }),
    ...(studyProgress.length
      ? [average(studyProgress.map((item) =>
          item.status === 'Completed' ? 100 : item.status === 'Partially Completed' ? 50 : item.status === 'Not Completed' ? 0 : null
        ))]
      : [])
  ].filter((value) => value !== null)
  return learningSignals.length
    ? clamp(100 - average(learningSignals))
    : null
}

function getCategoryRisks(student, context) {
  const academicScore = getAcademicScore(student)
  const attendanceScore = getAttendanceScore(student)
  const engagementScore = numeric(student.engagementScore ?? student.engagement)
  const fee = context.fee
  const balance = numeric(fee?.balance ?? (
    fee && fee.paidAmount !== undefined
      ? (fee.tuitionFee || 0) + (fee.activityFee || 0) + (fee.examinationFee || 0) - fee.paidAmount
      : null
  ))
  const totalFee = numeric(fee?.totalFee ?? (
    fee ? (fee.tuitionFee || 0) + (fee.activityFee || 0) + (fee.examinationFee || 0) : null
  ))
  const administrativeRisk = balance === null || totalFee === null || totalFee <= 0
    ? null
    : clamp((balance / totalFee) * 100)

  const academicTrend = trendName(student.trend?.academic ?? student.academicTrend)
  const attendanceTrend = trendName(student.trend?.attendance ?? student.attendanceTrend)
  const trendSignals = [academicTrend, attendanceTrend].filter(Boolean)
  const trendRisk = trendSignals.length
    ? average(trendSignals.map((trend) => trend === 'declining' ? 80 : trend === 'stable' ? 30 : 10))
    : null

  return {
    academic: academicScore === null ? null : clamp(100 - academicScore),
    attendance: attendanceScore === null ? null : clamp(100 - attendanceScore),
    assignments: getAssignmentRisk(student),
    engagement: engagementScore === null ? null : clamp(100 - engagementScore),
    learning: getLearningRisk(student, context.feedback, context.studyProgress),
    administrative: administrativeRisk,
    performanceTrend: trendRisk
  }
}

function getReasons(student, context, categories) {
  const reasons = []
  const attendance = getAttendanceScore(student)
  const academic = getAcademicScore(student)
  const pendingAssignments = (student.pendingAssignments || []).filter((item) =>
    String(item.status || 'Pending').toLowerCase() !== 'completed'
  )
  const academicTrend = trendName(student.trend?.academic ?? student.academicTrend)
  const attendanceTrend = trendName(student.trend?.attendance ?? student.attendanceTrend)
  const weakestSubjects = [...(student.subjectScores || [])]
    .map((subject) => ({
      subject: subject.subject,
      score: numeric(subject.currentScore ?? subject.score ?? subject.marks)
    }))
    .filter((subject) => subject.subject && subject.score !== null)
    .sort((left, right) => left.score - right.score)
    .slice(0, 2)

  if (attendance !== null && attendance < 75) {
    reasons.push(`Attendance is ${attendance.toFixed(0)}%${attendanceTrend === 'declining' ? ' and trending downward' : ''}.`)
  }
  if (academic !== null && academic < 65) {
    reasons.push(`Academic performance is ${academic.toFixed(0)}%${academicTrend === 'declining' ? ' and trending downward' : ''}.`)
  }
  if (weakestSubjects.length) {
    reasons.push(`Current subject results need attention in ${weakestSubjects.map((item) => `${item.subject} (${item.score.toFixed(0)}%)`).join(' and ')}.`)
  }
  if (pendingAssignments.length) {
    reasons.push(`${pendingAssignments.length} assignment${pendingAssignments.length === 1 ? ' is' : 's are'} still pending.`)
  } else if (numeric(student.assignmentMissed ?? student.assignmentsMissed) > 0) {
    reasons.push(`${student.assignmentMissed ?? student.assignmentsMissed} missed assignment${Number(student.assignmentMissed ?? student.assignmentsMissed) === 1 ? '' : 's'} are recorded.`)
  }
  const lowUnderstanding = context.feedback.filter((item) => numeric(item.understanding) !== null && Number(item.understanding) <= 2)
  if (lowUnderstanding.length) {
    reasons.push(`Student feedback reports difficulty understanding ${[...new Set(lowUnderstanding.map((item) => item.subject).filter(Boolean))].join(', ') || 'course material'}.`)
  }
  if (categories.engagement !== null && categories.engagement >= 50) {
    reasons.push('Participation in recorded campus activities is currently limited.')
  }
  if (categories.administrative !== null && categories.administrative >= 50) {
    reasons.push('The fee record shows an outstanding balance; confirm support options privately.')
  }
  return reasons
}

function getContributors(categories) {
  const available = Object.entries(categories)
    .filter(([, score]) => score !== null)
  const totalWeight = available.reduce((sum, [name]) => sum + CATEGORY_WEIGHTS[name], 0)
  return available.map(([name, score]) => {
    const weight = CATEGORY_WEIGHTS[name] / totalWeight
    return {
      name,
      score: Number(score.toFixed(1)),
      weight: Number((weight * 100).toFixed(1)),
      contribution: Number((score * weight).toFixed(1))
    }
  }).sort((left, right) => right.contribution - left.contribution)
}

function getRiskLevel(score) {
  if (score === null) return 'Unavailable'
  if (score <= 30) return 'Low'
  if (score <= 60) return 'Moderate'
  if (score <= 80) return 'High'
  return 'Critical'
}

function getTrend(previousRisk, currentRisk) {
  if (previousRisk === null) return { label: 'Baseline', change: null }
  const change = Number((currentRisk - previousRisk).toFixed(1))
  if (change > 15) return { label: 'Rapidly Increasing', change }
  if (change > 3) return { label: 'Increasing', change }
  if (change < -3) return { label: 'Improving', change }
  return { label: 'Stable', change }
}

function getRecommendations(categories, student, context) {
  const actions = []
  if (categories.academic !== null && categories.academic >= 35) {
    actions.push({ priority: 1, category: 'academic', action: 'Arrange a supportive mentor check-in and agree on one or two subject goals.' })
  }
  if (categories.assignments !== null && categories.assignments >= 35) {
    actions.push({ priority: 2, category: 'assignments', action: 'Review pending coursework and break the next assignment into a manageable milestone.' })
  }
  if (categories.attendance !== null && categories.attendance >= 25) {
    actions.push({ priority: 3, category: 'attendance', action: 'Discuss any barriers to attendance and monitor attendance together over the next two weeks.' })
  }
  if (categories.learning !== null && categories.learning >= 35) {
    actions.push({ priority: 4, category: 'learning', action: 'Offer a personalized study plan, learning resources, or subject tutoring.' })
  }
  if (categories.engagement !== null && categories.engagement >= 50) {
    actions.push({ priority: 5, category: 'engagement', action: 'Ask whether a suitable peer group, club, or campus activity could help the student feel connected.' })
  }
  if (categories.administrative !== null && categories.administrative >= 50) {
    actions.push({ priority: 6, category: 'administrative', action: 'Privately connect the student with the appropriate student-support or fee-advising office.' })
  }
  if (!actions.length && context.interventions.length) {
    actions.push({ priority: 1, category: 'general', action: 'Continue the current support plan and agree on a follow-up date with the student.' })
  }
  if (!actions.length) {
    actions.push({ priority: 1, category: 'general', action: 'Offer a routine check-in and ask the student what support would be useful.' })
  }
  const informed = actions.map((item) => {
    const related = context.interventions.filter((intervention) =>
      String(intervention.riskType || '').toLowerCase().replace(/[\s_-]/g, '') === item.category
    )
    const completed = related.filter((intervention) =>
      intervention.status === 'Completed' && (
        (intervention.outcomeAssessment && intervention.outcomeAssessment !== 'Not Yet Reviewed') ||
        (intervention.outcomeRiskScore != null && intervention.riskBeforeIntervention != null)
      )
    )
    const effectiveCount = completed.filter((intervention) =>
      intervention.outcomeAssessment === 'Improved' ||
      (!intervention.outcomeAssessment || intervention.outcomeAssessment === 'Not Yet Reviewed') &&
      Number.isFinite(Number(intervention.outcomeRiskScore)) &&
      intervention.outcomeRiskScore != null &&
      Number.isFinite(Number(intervention.riskBeforeIntervention)) &&
      intervention.riskBeforeIntervention != null &&
      Number(intervention.outcomeRiskScore) <= Number(intervention.riskBeforeIntervention) - 10
    ).length
    const needsMoreSupportCount = completed.filter((intervention) =>
      intervention.outcomeAssessment === 'Needs More Support' ||
      intervention.outcomeAssessment === 'No Change' ||
      (
        (!intervention.outcomeAssessment || intervention.outcomeAssessment === 'Not Yet Reviewed') &&
        intervention.outcomeRiskScore != null &&
        intervention.riskBeforeIntervention != null &&
        Number(intervention.outcomeRiskScore) >= Number(intervention.riskBeforeIntervention)
      )
    ).length
    const action = effectiveCount > 0
      ? `${item.action} ${effectiveCount} similar completed support action${effectiveCount === 1 ? ' has' : 's have'} a recorded improved outcome. This is observational, not proof of causation.`
      : needsMoreSupportCount > 0
        ? `${item.action} A similar completed action did not show improvement in ${needsMoreSupportCount} recorded case${needsMoreSupportCount === 1 ? '' : 's'}; review the student's response and agree on an alternative with them.`
        : item.action
    return {
      priority: effectiveCount > 0 ? Math.max(1, item.priority - 1) : item.priority,
      action,
      observedOutcomes: completed.length,
      improvedOutcomes: effectiveCount,
      needsMoreSupportOutcomes: needsMoreSupportCount,
      awaitingOutcome: related.filter((intervention) =>
        intervention.status === 'Completed' &&
        (!intervention.outcomeAssessment || intervention.outcomeAssessment === 'Not Yet Reviewed') &&
        (intervention.outcomeRiskScore == null || intervention.riskBeforeIntervention == null)
      ).length
    }
  })
  return informed.sort((left, right) => left.priority - right.priority).slice(0, 4)
}

export function buildRiskIntelligence(student, context = {}) {
  const safeContext = {
    feedback: context.feedback || [],
    interventions: context.interventions || [],
    studyProgress: context.studyProgress || []
  }
  const categories = getCategoryRisks(student, { ...safeContext, fee: context.fee || null })
  const contributors = getContributors(categories)
  const riskScore = contributors.length
    ? Number(clamp(contributors.reduce((sum, factor) => sum + factor.contribution, 0)).toFixed(1))
    : null
  const history = (context.history || []).map((record) => ({
    riskScore: numeric(record.riskScore),
    assessedAt: record.assessedAt || record.createdAt,
    factors: record.factors || []
  })).filter((record) => record.riskScore !== null)
    .sort((left, right) => new Date(left.assessedAt) - new Date(right.assessedAt))
  const previous = history.at(-1) || null
  const trend = getTrend(previous?.riskScore ?? null, riskScore)
  const signals = {
    attendanceDeclining: trendName(student.trend?.attendance ?? student.attendanceTrend) === 'declining',
    academicDeclining: trendName(student.trend?.academic ?? student.academicTrend) === 'declining',
    academicWeak: categories.academic !== null && categories.academic >= 40,
    attendanceWeak: categories.attendance !== null && categories.attendance >= 35,
    assignmentsWeak: categories.assignments !== null && categories.assignments >= 40,
    learningConcern: categories.learning !== null && categories.learning >= 50
  }
  const activeSignals = Object.values(signals).filter(Boolean).length
  const detectedPatterns = activeSignals >= 2
    ? [{
        title: 'Multiple support signals detected',
        detail: [
          signals.attendanceDeclining && 'attendance is declining',
          signals.academicDeclining && 'academic performance is declining',
          signals.academicWeak && 'academic performance is below the support threshold',
          signals.assignmentsWeak && 'assignment completion needs attention',
          signals.learningConcern && 'learning activity or student feedback indicates a learning gap'
        ].filter(Boolean).join('; ') + '.',
        interpretation: 'Taken together, these indicators suggest that a timely, supportive check-in may be helpful.'
      }]
    : []

  let prediction = {
    available: false,
    explanation: 'Record assessments on different dates to establish a history-based projection.',
    nextTwoWeeks: null,
    nextFourWeeks: null,
    factors: []
  }
  if (history.length >= 1 && riskScore !== null) {
    const baseline = history.at(-1)
    const elapsedDays = Math.max(1, (Date.now() - new Date(baseline.assessedAt).getTime()) / 86400000)
    if (elapsedDays >= 3) {
      const weeklyChange = clamp(((riskScore - baseline.riskScore) / elapsedDays) * 7, -12, 12)
      prediction = {
        available: true,
        explanation: 'A cautious linear estimate from recorded assessments, not a certain outcome.',
        nextTwoWeeks: Number(clamp(riskScore + weeklyChange * 2).toFixed(1)),
        nextFourWeeks: Number(clamp(riskScore + weeklyChange * 4).toFixed(1)),
        factors: contributors.slice(0, 3).map((item) => item.name)
      }
    }
  }

  const actionHistory = safeContext.interventions.map((item) => ({
    ...item,
    effectiveness: item.status !== 'Completed'
      ? 'In Progress'
      : item.outcomeAssessment === 'Improved'
        ? 'Improved (reported)'
        : item.outcomeAssessment === 'No Change'
          ? 'No Change (reported)'
          : item.outcomeAssessment === 'Needs More Support'
            ? 'Needs More Support (reported)'
            : item.outcomeAssessment !== 'Not Yet Reviewed' && item.outcomeAssessment
              ? item.outcomeAssessment
              : item.outcomeRiskScore == null || item.riskBeforeIntervention == null
              ? 'Still Under Evaluation'
      : Number(item.outcomeRiskScore) <= Number(item.riskBeforeIntervention) - 10
        ? 'Effective'
        : Number(item.outcomeRiskScore) < Number(item.riskBeforeIntervention)
          ? 'Partially Effective'
          : 'Not Effective'
  }))

  return {
    student: {
      studentId: student.studentId,
      name: student.name,
      department: student.department,
      year: student.year,
      semester: student.semester
    },
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    supportIndicator: 'This score is a support indicator based on available data, not a permanent label or diagnosis.',
    categories: Object.fromEntries(Object.entries(categories).map(([name, score]) => [
      name,
      score === null ? null : Number(score.toFixed(1))
    ])),
    contributors,
    reasons: getReasons(student, safeContext, categories),
    trend,
    trendStart: trend.change !== null && trend.change > 3 ? previous?.assessedAt || null : null,
    history: history.slice(-6),
    detectedPatterns,
    prediction,
    recommendations: getRecommendations(categories, student, safeContext),
    interventions: actionHistory,
    dataCoverage: {
      availableCategories: contributors.length,
      totalCategories: Object.keys(CATEGORY_WEIGHTS).length,
      missingCategories: Object.keys(CATEGORY_WEIGHTS).filter((name) => categories[name] === null)
    }
  }
}

export function summarizeRiskIntelligence(assessments) {
  const available = assessments.filter((item) => item.riskScore !== null)
  const departments = new Map()
  for (const item of available) {
    const name = item.student.department || 'Unspecified'
    const bucket = departments.get(name) || { department: name, total: 0, students: 0, needingSupport: 0 }
    bucket.total += item.riskScore
    bucket.students += 1
    if (item.riskScore > 60) bucket.needingSupport += 1
    departments.set(name, bucket)
  }
  const categoryAverages = {}
  for (const name of Object.keys(CATEGORY_WEIGHTS)) {
    const scores = available.map((item) => item.categories[name]).filter((score) => score !== null)
    categoryAverages[name] = scores.length
      ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1))
      : null
  }
  return {
    assessedStudents: available.length,
    needingSupport: available.filter((item) => item.riskScore > 60).length,
    averageRisk: available.length
      ? Number((available.reduce((sum, item) => sum + item.riskScore, 0) / available.length).toFixed(1))
      : null,
    categoryAverages,
    departments: [...departments.values()].map((item) => ({
      ...item,
      averageRisk: Number((item.total / item.students).toFixed(1))
    })).sort((left, right) => right.averageRisk - left.averageRisk)
  }
}
