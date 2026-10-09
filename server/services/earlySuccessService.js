const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const average = (values) => {
  const available = values.map(numberOrNull).filter((value) => value !== null)
  return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null
}

function getAcademicScore(student) {
  const profileScore = numberOrNull(student.academicPerformance)
  if (profileScore !== null) return profileScore
  const subjectScore = average((student.subjectScores || []).map((subject) =>
    subject.currentScore ?? subject.internalScore ?? subject.score ?? subject.marks
  ))
  if (subjectScore !== null) return subjectScore
  const cgpa = numberOrNull(student.cgpa)
  return cgpa === null ? null : cgpa * 10
}

function getPreviousAcademicScore(student, context) {
  const provided = numberOrNull(context.previousAcademicScore)
  if (provided !== null) return provided
  return average((student.subjectScores || []).map((subject) =>
    subject.previousExamScore ?? subject.previousScore
  ))
}

function getTrend(value) {
  const trend = String(value || '').toLowerCase()
  if (trend.includes('declin') || trend.includes('decreas')) return 'declining'
  if (trend.includes('improv') || trend.includes('increas')) return 'improving'
  if (trend.includes('stable') || trend.includes('maintain')) return 'stable'
  return null
}

function personalizeFromInterventions(recommendations, interventions) {
  return recommendations.map((recommendation) => {
    const text = recommendation.toLowerCase()
    const categories = text.includes('attendance') ? ['attendance']
      : text.includes('assignment') || text.includes('coursework') ? ['assignment', 'academic']
        : text.includes('study block') || text.includes('assessment') || text.includes('topic') ? ['academic', 'study']
          : text.includes('mentor') || text.includes('faculty') ? ['academic', 'attendance', 'learning']
            : []
    const related = interventions.filter((intervention) => {
      const riskType = String(intervention.riskType || '').toLowerCase().replace(/[\s_-]/g, '')
      return categories.some((category) => riskType.includes(category.replace(/[\s_-]/g, '')))
    })
    const reviewed = related.filter((intervention) => intervention.status === 'Completed' && (
      intervention.outcomeAssessment && intervention.outcomeAssessment !== 'Not Yet Reviewed' ||
      intervention.riskBeforeIntervention != null && intervention.outcomeRiskScore != null
    ))
    const needsMoreSupport = reviewed.some((intervention) =>
      intervention.outcomeAssessment === 'Needs More Support' ||
      intervention.outcomeAssessment === 'No Change' ||
      (!intervention.outcomeAssessment || intervention.outcomeAssessment === 'Not Yet Reviewed') &&
        intervention.outcomeRiskScore != null &&
        intervention.riskBeforeIntervention != null &&
        Number(intervention.outcomeRiskScore) >= Number(intervention.riskBeforeIntervention)
    )
    const improved = reviewed.some((intervention) =>
      intervention.outcomeAssessment === 'Improved' ||
      (!intervention.outcomeAssessment || intervention.outcomeAssessment === 'Not Yet Reviewed') &&
        intervention.outcomeRiskScore != null &&
        intervention.riskBeforeIntervention != null &&
        Number(intervention.outcomeRiskScore) < Number(intervention.riskBeforeIntervention)
    )
    if (needsMoreSupport) {
      return `${recommendation} A similar completed support action did not yet show improvement; review the student's response and agree on a different or additional support step.`
    }
    if (improved) {
      return `${recommendation} Similar completed support has a recorded improved outcome; consider continuing it if the student finds it helpful. This is observational, not proof of causation.`
    }
    return recommendation
  })
}

function makePlan(student, signals, weakSubjects, pendingAssignments, missedAssignments, upcomingExams) {
  const assignmentSignal = signals.find((signal) => signal.key === 'assignments')
  const attendanceSignal = signals.find((signal) => signal.key === 'attendance')
  const exam = upcomingExams[0]
  const subjectNames = weakSubjects.map((subject) => subject.subject)
  const focusSubject = subjectNames[0] || exam?.subject || student.subjectScores?.[0]?.subject
  const assignmentTitle = (index) => pendingAssignments[index]?.title
    || (pendingAssignments[index]?.subject ? `${pendingAssignments[index].subject} assignment` : `pending assignment ${index + 1}`)
  const plan = []

  for (let day = 1; day <= 7; day += 1) {
    let action
    if (day === 1 && focusSubject) {
      action = `Spend 30 minutes reviewing one recent topic in ${focusSubject}.`
    } else if (assignmentSignal && pendingAssignments.length && day <= pendingAssignments.length + (focusSubject ? 1 : 0)) {
      const assignmentIndex = day - (focusSubject ? 2 : 1)
      action = `Work on ${assignmentTitle(assignmentIndex)} for 30–45 minutes${pendingAssignments[assignmentIndex]?.dueDate ? `; due ${new Date(pendingAssignments[assignmentIndex].dueDate).toLocaleDateString()}` : ''}.`
    } else if (attendanceSignal && day === 2) {
      action = 'Attend your next scheduled class and note any attendance barriers you would like help with.'
    } else if (missedAssignments > 0 && day === 3) {
      action = `Review the ${missedAssignments} recorded missed assignment${missedAssignments === 1 ? '' : 's'} and ask your faculty which can still be completed.`
    } else if (focusSubject && day % 2 === 0) {
      action = `Practice a small set of questions for ${focusSubject} for up to 30 minutes.`
    } else if (exam) {
      action = `Review one topic for ${exam.subject}${exam.examDate ? ` before the exam on ${new Date(exam.examDate).toLocaleDateString()}` : ''}.`
    } else {
      action = 'Review this week’s class notes for 20–30 minutes, then note one question to ask in class.'
    }
    plan.push({ day, action })
  }
  return plan
}

export function buildEarlySuccessAssessment(student, context = {}) {
  const attendance = numberOrNull(student.attendance ?? context.attendance?.overallAttendance)
  const monthlyAttendance = context.attendance?.monthlyTrend || []
  const attendanceHistory = monthlyAttendance.map((item) => numberOrNull(item.percentage)).filter((value) => value !== null)
  const previousAttendance = numberOrNull(student.previousAttendance)
    ?? numberOrNull(context.previousAttendance)
    ?? (attendanceHistory.length >= 2 ? attendanceHistory.at(-2) : null)
  const attendanceChange = attendance !== null && previousAttendance !== null
    ? attendance - previousAttendance
    : null
  const recordedAttendanceTrend = getTrend(student.trend?.attendance ?? student.attendanceTrend)
  const attendanceTrend = attendanceChange !== null && Math.abs(attendanceChange) >= 5
    ? attendanceChange < 0 ? 'declining' : 'improving'
    : recordedAttendanceTrend || (attendanceChange !== null ? 'stable' : null)

  const academicScore = getAcademicScore(student)
  const previousAcademicScore = getPreviousAcademicScore(student, context)
  const academicChange = academicScore !== null && previousAcademicScore !== null
    ? academicScore - previousAcademicScore
    : null
  const recordedAcademicTrend = getTrend(student.trend?.academic ?? student.academicTrend)
  const academicTrend = academicChange !== null && Math.abs(academicChange) >= 5
    ? academicChange < 0 ? 'declining' : 'improving'
    : recordedAcademicTrend || (academicChange !== null ? 'stable' : null)

  const subjects = (student.subjectScores || []).map((subject) => ({
    subject: subject.subject,
    score: numberOrNull(subject.currentScore ?? subject.internalScore ?? subject.score ?? subject.marks),
    previousScore: numberOrNull(subject.previousExamScore ?? subject.previousScore)
  })).filter((subject) => subject.score !== null)
  const weakSubjects = subjects
    .filter((subject) => subject.score < 65 || (subject.previousScore !== null && subject.score <= subject.previousScore - 5))
    .sort((left, right) => left.score - right.score)
    .slice(0, 2)
  const assignments = Array.isArray(student.pendingAssignments) ? student.pendingAssignments : []
  const pendingAssignments = assignments.filter((item) => String(item.status || 'Pending').toLowerCase() !== 'completed')
  const missedAssignments = numberOrNull(context.lmsActivity?.assignmentsMissed)
    ?? numberOrNull(student.assignmentMissed ?? student.assignmentsMissed)
    ?? 0
  const lmsCompleted = numberOrNull(context.lmsActivity?.assignmentsCompleted)
  const assignmentCompletion = numberOrNull(student.assignmentCompletion)
    ?? (lmsCompleted !== null && lmsCompleted + missedAssignments > 0
      ? (lmsCompleted / (lmsCompleted + missedAssignments)) * 100
      : null)
  const lmsActivity = numberOrNull(student.lmsActivity ?? context.lmsActivity?.courseProgress)
  const priorLmsActivity = numberOrNull(context.previousLmsActivity)
  const learningDeclining = lmsActivity !== null && priorLmsActivity !== null && lmsActivity <= priorLmsActivity - 10
  const lowUnderstanding = (context.subjectFeedback || []).filter((item) => numberOrNull(item.understanding) !== null && Number(item.understanding) <= 2)
  const lowMorale = (context.facultyFeedback || []).some((item) => {
    const score = numberOrNull(item.moraleScore)
    return score !== null && score < 50
  })
  const studyProgress = context.studyProgress || []
  const studyCompletion = studyProgress.reduce((total, item) =>
    total + (item.status === 'Completed' ? 1 : item.status === 'Partially Completed' ? 0.5 : 0), 0)
  const lowStudyPlanCompletion = studyProgress.length >= 3 && studyCompletion / studyProgress.length < 0.5
  const upcomingExams = (student.upcomingExams || [])
    .filter((exam) => !exam.examDate || new Date(exam.examDate) >= new Date())
    .sort((left, right) => new Date(left.examDate || 0) - new Date(right.examDate || 0))

  const signals = []
  if ((attendance !== null && attendance < 75) || attendanceTrend === 'declining') {
    signals.push({
      key: 'attendance',
      label: 'Attendance may need attention',
      detail: attendanceChange !== null && attendanceChange < 0
        ? `Attendance is ${attendance}%${previousAttendance !== null ? `, down ${Math.abs(attendanceChange).toFixed(0)} points from ${previousAttendance}%` : ''}.`
        : attendance === null ? 'Recent attendance is trending downward.' : `Current attendance is ${attendance}%.`
    })
  }
  if ((academicScore !== null && academicScore < 65) || academicTrend === 'declining' || weakSubjects.length > 0) {
    signals.push({
      key: 'academic',
      label: 'Recent marks need attention',
      detail: academicChange !== null && academicChange < 0
        ? `Recent academic marks are down ${Math.abs(academicChange).toFixed(0)} points compared with the previous assessment.`
        : weakSubjects.length ? `Recent results need attention in ${weakSubjects.map((subject) => subject.subject).join(' and ')}.` : 'Current academic performance is below the support threshold.'
    })
  }
  if (pendingAssignments.length || missedAssignments > 0 || (assignmentCompletion !== null && assignmentCompletion < 75)) {
    signals.push({
      key: 'assignments',
      label: 'Assignments need follow-up',
      detail: [
        pendingAssignments.length ? `${pendingAssignments.length} pending` : '',
        missedAssignments ? `${missedAssignments} recorded missed` : '',
        assignmentCompletion !== null && assignmentCompletion < 75 ? `${assignmentCompletion.toFixed(0)}% completion` : ''
      ].filter(Boolean).join('; ') + '.'
    })
  }
  if (learningDeclining || lowUnderstanding.length || lowMorale || lowStudyPlanCompletion || (lmsActivity !== null && lmsActivity < 40)) {
    signals.push({
      key: 'learning',
      label: 'Learning activity or feedback suggests extra support may help',
      detail: lowUnderstanding.length
        ? `Recent feedback reports difficulty understanding ${[...new Set(lowUnderstanding.map((item) => item.subject).filter(Boolean))].join(', ') || 'course material'}.`
        : learningDeclining ? 'Recorded learning activity has decreased from the previous check.'
          : lowStudyPlanCompletion ? 'Recent study-plan check-ins show that several planned tasks were not completed.'
            : 'Available learning activity or feedback suggests a check-in could be useful.'
    })
  }
  const imminentExam = upcomingExams.find((exam) => {
    const days = (new Date(exam.examDate) - new Date()) / 86400000
    return Number.isFinite(days) && days <= 21
  })
  if (imminentExam && (pendingAssignments.length || missedAssignments > 0 || weakSubjects.length || (academicScore !== null && academicScore < 75))) {
    signals.push({
      key: 'exam-readiness',
      label: 'Upcoming assessment preparation',
      detail: `${imminentExam.subject} has an upcoming assessment while coursework is still pending.`
    })
  }

  const riskScore = Math.min(100, signals.reduce((score, signal) => score + ({
    attendance: attendance !== null && attendance < 60 ? 30 : 20,
    academic: academicScore !== null && academicScore < 50 ? 30 : 22,
    assignments: 18,
    learning: 18,
    'exam-readiness': 10
  })[signal.key], 0))
  const priority = signals.length < 2
    ? 'Information'
    : (signals.length >= 3 && riskScore >= 65) || (attendance !== null && attendance < 60 && academicTrend === 'declining' && pendingAssignments.length > 0)
      ? 'Urgent Support'
      : 'Attention'
  const academicRisk = signals.length < 2 ? 'Low' : priority === 'Urgent Support' ? 'High' : 'Moderate'
  const trend = academicTrend === 'declining' || attendanceTrend === 'declining'
    ? 'Increasing'
    : academicTrend === 'improving' || attendanceTrend === 'improving' ? 'Improving' : 'Stable'
  const prediction = priority === 'Information'
    ? 'No combined early-warning pattern is currently detected from the available data.'
    : 'If the current pattern continues, the student may need extra support with an upcoming assessment. This is an early estimate, not a guaranteed outcome.'

  const recommendations = []
  if (attendance !== null && (attendance < 75 || attendanceTrend === 'declining')) {
    recommendations.push('Attend upcoming classes consistently, track attendance weekly, and discuss any barriers with a faculty mentor.')
  }
  if (weakSubjects.length) {
    recommendations.push(`Set aside a short study block for ${weakSubjects.map((subject) => subject.subject).join(' and ')}, starting with one topic at a time.`)
  } else if (signals.some((signal) => signal.key === 'academic')) {
    recommendations.push('Review your latest assessment, choose one topic where marks dropped, and ask your instructor a focused question.')
  }
  if (pendingAssignments.length) {
    recommendations.push(`Choose the nearest-due pending assignment and complete it in a manageable 30–45 minute block.`)
  }
  if (!pendingAssignments.length && missedAssignments > 0) {
    recommendations.push(`Check with your faculty which of the ${missedAssignments} recorded missed assignment${missedAssignments === 1 ? '' : 's'} can still be completed, then choose one next step.`)
  }
  if (imminentExam) {
    recommendations.push(`Begin short revision sessions for ${imminentExam.subject} before the upcoming assessment.`)
  }
  if (lowUnderstanding.length || lowMorale) {
    recommendations.push('Ask your faculty member or mentor for help with difficult topics; a brief check-in can help identify useful support.')
  }
  if (!recommendations.length && priority === 'Information') {
    recommendations.push('Keep following your current study plan and check back after your next assessment or attendance update.')
  }

  const attendanceOnly = signals.length > 0 && signals.every((signal) => signal.key === 'attendance')
  let notification = priority === 'Information' ? null : {
    title: priority === 'Urgent Support' ? 'Support is available' : 'Early academic alert',
    message: `Hi ${student.name || 'there'}, recent academic activity may need attention. These are early indicators, and support is recommended before upcoming assessments.`,
    reasons: signals.map((signal) => signal.detail)
  }
  let signature = signals.map((signal) => signal.key).sort().join('|')
  const priorSnapshot = context.priorSnapshot || null
  const progress = priorSnapshot ? {
    previous: {
      attendance: numberOrNull(priorSnapshot.attendance),
      riskScore: numberOrNull(priorSnapshot.riskScore)
    },
    attendanceChange: attendance !== null && numberOrNull(priorSnapshot.attendance) !== null
      ? Number((attendance - Number(priorSnapshot.attendance)).toFixed(1))
      : null,
    riskChange: numberOrNull(priorSnapshot.riskScore) !== null
      ? Number((riskScore - Number(priorSnapshot.riskScore)).toFixed(1))
      : null
  } : null
  const adaptiveMessage = progress?.riskChange <= -5
    ? 'Great progress! Your recent indicators have improved compared with the previous check. Keep following your current study plan.'
    : priority !== 'Information' && priorSnapshot
      ? 'Your recent indicators still suggest a check-in may help. Consider speaking with your faculty mentor about additional support.'
      : null
  if (priority === 'Information' && adaptiveMessage?.startsWith('Great progress')) {
    notification = {
      title: 'Progress update',
      message: adaptiveMessage,
      reasons: []
    }
    signature = `progress-improved:${new Date().toISOString().slice(0, 10)}`
  }
  const pendingForPlan = pendingAssignments.slice().sort((left, right) =>
    new Date(left.dueDate || '9999-12-31') - new Date(right.dueDate || '9999-12-31')
  )

  return {
    featureName: 'CampusPulse Early Success Alert',
    tagline: 'Detect Early. Act Early. Succeed Better.',
    student: { studentId: student.studentId, name: student.name },
    academicRisk,
    trend,
    prediction,
    priority,
    riskScore,
    attendance,
    previousAttendance,
    academicScore,
    previousAcademicScore,
    academicChange,
    pendingAssignments: pendingForPlan.length,
    missedAssignments,
    assignmentCompletion,
    signals,
    recommendations: personalizeFromInterventions(recommendations, context.interventions || []),
    plan: makePlan(student, signals, weakSubjects, pendingForPlan, missedAssignments, upcomingExams),
    attendanceOnly,
    notification,
    signature,
    progress,
    adaptiveMessage,
    assessedAt: new Date().toISOString()
  }
}
