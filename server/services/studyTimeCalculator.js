export const STUDY_TIME_CONFIG = {
  performanceBands: [
    { label: 'CRITICAL', min: 0, max: 39, weeklyLow: 5, weeklyHigh: 6 },
    { label: 'WEAK', min: 40, max: 59, weeklyLow: 3, weeklyHigh: 4 },
    { label: 'MODERATE', min: 60, max: 69, weeklyLow: 2, weeklyHigh: 3 },
    { label: 'GOOD', min: 70, max: 79, weeklyLow: 1, weeklyHigh: 2 },
    { label: 'STRONG', min: 80, max: 89, weeklyLow: 0.5, weeklyHigh: 1 },
    { label: 'EXCELLENT', min: 90, max: 100, weeklyLow: 0.5, weeklyHigh: 1 }
  ],
  weeklyHoursByPriority: [
    { min: 0, max: 19, low: 0.5, high: 1 },
    { min: 20, max: 39, low: 1, high: 2 },
    { min: 40, max: 59, low: 2, high: 3 },
    { min: 60, max: 79, low: 3, high: 4 },
    { min: 80, max: 100, low: 4, high: 6 }
  ],
  weights: {
    performanceGap: 0.35,
    recentTrend: 0.15,
    examUrgency: 0.2,
    backlog: 0.1,
    difficulty: 0.1,
    assignmentQuizWeakness: 0.05,
    attendanceWithWeakMarks: 0.05
  }
}

const trendScores = { declining: 100, stable: 50, improving: 0 }
const difficultyScores = { easy: 25, medium: 50, hard: 75, 'very hard': 100 }
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

function classifyPerformance(score) {
  return STUDY_TIME_CONFIG.performanceBands.find((band) => score >= band.min && score <= band.max)?.label || 'MODERATE'
}

function resolveTrend(subject) {
  if (['declining', 'stable', 'improving'].includes(subject.trend)) return subject.trend
  if (subject.previousExamScore === null) return 'stable'
  const difference = subject.currentScore - subject.previousExamScore
  if (difference <= -5) return 'declining'
  if (difference >= 5) return 'improving'
  return 'stable'
}

function getExamUrgency(examDate, today) {
  if (!examDate) return 0
  const days = Math.ceil((new Date(examDate).setHours(0, 0, 0, 0) - today.getTime()) / 86400000)
  if (!Number.isFinite(days) || days < 0) return 0
  if (days <= 2) return 100
  if (days <= 7) return 85
  if (days <= 14) return 65
  if (days <= 30) return 40
  return 15
}

function getPriorityName(score, subject, performance) {
  const performancePriority = {
    CRITICAL: 'Very High',
    WEAK: 'High',
    MODERATE: 'Medium',
    GOOD: 'Normal',
    STRONG: 'Low',
    EXCELLENT: 'Maintenance'
  }[performance]
  const formulaPriority = score >= 90 ? 'Very High'
    : score >= 80 ? 'High'
      : score >= 60 ? 'Medium'
        : score >= 40 ? 'Normal'
          : score >= 20 ? 'Low'
            : 'Maintenance'
  const priorityOrder = ['Maintenance', 'Low', 'Normal', 'Medium', 'High', 'Very High']
  if (subject.backlog) return 'Very High'
  return priorityOrder[Math.max(priorityOrder.indexOf(performancePriority), priorityOrder.indexOf(formulaPriority))]
}

function interpolate(value, min, max, low, high) {
  const fraction = clamp((value - min) / Math.max(1, max - min), 0, 1)
  return low + fraction * (high - low)
}

function getBaseWeeklyHours(priorityScore, performance, currentScore) {
  const priorityBand = STUDY_TIME_CONFIG.weeklyHoursByPriority.find((item) =>
    priorityScore >= item.min && priorityScore <= item.max)
  const performanceBand = STUDY_TIME_CONFIG.performanceBands.find((item) => item.label === performance)
  const priorityHours = priorityBand
    ? interpolate(priorityScore, priorityBand.min, priorityBand.max, priorityBand.low, priorityBand.high)
    : 0.75
  const performanceHours = performanceBand
    ? interpolate(currentScore, performanceBand.min, performanceBand.max, performanceBand.weeklyLow, performanceBand.weeklyHigh)
    : 0.75
  return Math.max(priorityHours, performanceHours)
}

function splitMinutes(total, practiceRatio) {
  const practiceMinutes = Math.round(total * practiceRatio)
  return { practiceMinutes, revisionMinutes: total - practiceMinutes }
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function createSchedule(subjects, placementMinutes, startTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  let clockMinutes = startHour * 60 + startMinute
  let focusMinutes = 0
  const items = []

  const activities = subjects.flatMap((subject) => [
    ...(subject.dailyPracticeMinutes > 0 ? [{
      type: 'Practice',
      label: subject.subject,
      minutes: subject.dailyPracticeMinutes
    }] : []),
    ...(subject.dailyRevisionMinutes > 0 ? [{
      type: 'Revision',
      label: subject.subject,
      minutes: subject.dailyRevisionMinutes
    }] : [])
  ])
  if (placementMinutes > 0) activities.push({ type: 'Placement preparation', label: 'Coding and placement practice', minutes: placementMinutes })

  for (const [activityIndex, activity] of activities.entries()) {
    let remaining = activity.minutes
    while (remaining > 0) {
      const chunk = Math.min(remaining, 50 - focusMinutes % 50 || 50)
      items.push({
        type: activity.type,
        label: activity.label,
        startTime: formatTime(clockMinutes),
        endTime: formatTime(clockMinutes + chunk),
        minutes: chunk
      })
      clockMinutes += chunk
      focusMinutes += chunk
      remaining -= chunk
      if ((remaining > 0 || activityIndex < activities.length - 1) && focusMinutes % 50 === 0) {
        items.push({
          type: 'Break',
          label: 'Short break',
          startTime: formatTime(clockMinutes),
          endTime: formatTime(clockMinutes + 10),
          minutes: 10
        })
        clockMinutes += 10
      }
    }
  }
  return items
}

export function calculatePersonalizedStudyPlan({
  subjects: inputSubjects,
  availableDailyHours,
  placementMinutesPerDay = 20,
  startTime = '18:00',
  today = new Date()
}) {
  if (!Array.isArray(inputSubjects) || inputSubjects.length === 0) {
    throw new Error('Add at least one subject with a current score to calculate your plan.')
  }
  if (inputSubjects.some((subject) => subject.currentScore === '' || subject.currentScore == null)) {
    throw new Error('Every subject needs a current score from 0 to 100.')
  }
  if (!Number.isFinite(availableDailyHours) || availableDailyHours < 0.5 || availableDailyHours > 16) {
    throw new Error('Available study time must be between 0.5 and 16 hours per day.')
  }
  if (!Number.isInteger(placementMinutesPerDay) || placementMinutesPerDay < 0 || placementMinutesPerDay > 240) {
    throw new Error('Placement preparation must be between 0 and 240 minutes per day.')
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    throw new Error('Choose a valid daily start time in HH:MM format.')
  }

  const subjects = inputSubjects.map((input) => {
    const subject = {
      ...input,
      subject: String(input.subject || '').trim(),
      currentScore: Number(input.currentScore),
      targetScore: Number(input.targetScore ?? 80),
      internalScore: input.internalScore === '' || input.internalScore == null ? null : Number(input.internalScore),
      previousExamScore: input.previousExamScore === '' || input.previousExamScore == null ? null : Number(input.previousExamScore),
      assignmentScore: input.assignmentScore === '' || input.assignmentScore == null ? null : Number(input.assignmentScore),
      quizScore: input.quizScore === '' || input.quizScore == null ? null : Number(input.quizScore),
      attendance: input.attendance === '' || input.attendance == null ? null : Number(input.attendance),
      trend: input.trend || 'auto',
      difficulty: String(input.difficulty || 'medium').toLowerCase()
    }
    if (!subject.subject || subject.subject.length > 80) throw new Error('Every subject needs a name of 1 to 80 characters.')
    for (const field of ['currentScore', 'targetScore', 'internalScore', 'previousExamScore', 'assignmentScore', 'quizScore', 'attendance']) {
      if (subject[field] !== null && (!Number.isFinite(subject[field]) || subject[field] < 0 || subject[field] > 100)) {
        throw new Error(`${field} must be between 0 and 100.`)
      }
    }
    if (!['auto', 'declining', 'stable', 'improving'].includes(subject.trend)) throw new Error(`${subject.subject}: choose a valid performance trend.`)
    if (!(subject.difficulty in difficultyScores)) throw new Error(`${subject.subject}: choose a valid difficulty.`)

    const performance = classifyPerformance(subject.currentScore)
    const trend = resolveTrend(subject)
    const gap = Math.max(0, subject.targetScore - subject.currentScore)
    const gapFactor = clamp((gap / 50) * 100)
    const trendFactor = trendScores[trend]
    const examUrgency = getExamUrgency(subject.examDate, today)
    const backlogFactor = subject.backlog ? 100 : 0
    const difficultyFactor = difficultyScores[subject.difficulty]
    const courseworkScores = [subject.internalScore, subject.assignmentScore, subject.quizScore].filter(Number.isFinite)
    const courseworkWeakness = courseworkScores.length
      ? 100 - courseworkScores.reduce((sum, value) => sum + value, 0) / courseworkScores.length
      : 0
    const attendanceFactor = subject.currentScore < 70 && subject.attendance !== null && subject.attendance < 75
      ? clamp((75 - subject.attendance) * 4)
      : 0
    const factors = {
      performanceGap: gapFactor,
      recentTrend: trendFactor,
      examUrgency,
      backlog: backlogFactor,
      difficulty: difficultyFactor,
      assignmentQuizWeakness: courseworkWeakness,
      attendanceWithWeakMarks: attendanceFactor
    }
    const priorityScore = Math.round(Object.entries(STUDY_TIME_CONFIG.weights)
      .reduce((score, [factor, weight]) => score + factors[factor] * weight, 0))
    const weeklyTimeMultiplier =
      (trend === 'declining' ? 1.2 : trend === 'improving' ? 0.9 : 1) *
      (examUrgency >= 85 ? 1.35 : examUrgency >= 65 ? 1.2 : examUrgency >= 40 ? 1.1 : 1)
    let weeklyHours = getBaseWeeklyHours(priorityScore, performance, subject.currentScore) * weeklyTimeMultiplier
    if (subject.backlog) weeklyHours = Math.max(5, weeklyHours)
    if (subject.examDate && examUrgency === 100) weeklyHours = Math.max(weeklyHours, 2)
    weeklyHours = Math.round(weeklyHours * 10) / 10

    const reasons = [
      `Current score is ${subject.currentScore}% against a ${subject.targetScore}% target (gap ${gap} points).`,
      `Recent trend is ${trend}${subject.previousExamScore !== null ? ` (previous exam ${subject.previousExamScore}%, current ${subject.currentScore}%).` : '.'}`,
      ...(examUrgency > 0 ? [`Exam urgency is ${examUrgency}/100${Math.ceil((new Date(subject.examDate).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86400000) <= 2 ? '; focus on revision.' : '.'}`] : []),
      `Subject difficulty is ${subject.difficulty} (${difficultyFactor}/100).`,
      ...(subject.backlog ? ['A backlog requires a catch-up study block.'] : []),
      ...(courseworkScores.length ? [`Internal/assignment/quiz average is ${Math.round(100 - courseworkWeakness)}%.`] : []),
      ...(attendanceFactor > 0 ? [`Attendance is ${subject.attendance}% while marks are below 70%; attend upcoming classes consistently.`] : [])
    ]
    const isRevisionFocused = examUrgency === 100 || performance === 'STRONG' || performance === 'EXCELLENT'
    const practiceRatio = isRevisionFocused ? 0.3 : 0.65

    return {
      subject: subject.subject,
      currentScore: subject.currentScore,
      targetScore: subject.targetScore,
      performance,
      gap,
      trend,
      difficulty: subject.difficulty,
      examDate: subject.examDate || null,
      backlog: Boolean(subject.backlog),
      priorityScore,
      priority: getPriorityName(priorityScore, subject, performance),
      factors,
      reasons,
      weeklyHours,
      weeklyMinutes: Math.round(weeklyHours * 60),
      isRevisionFocused,
      practiceRatio
    }
  })
  const uniqueNames = new Set()
  for (const subject of subjects) {
    const key = subject.subject.toLowerCase()
    if (uniqueNames.has(key)) throw new Error(`Remove the duplicate ${subject.subject} entry.`)
    uniqueNames.add(key)
  }

  const dailyBudgetMinutes = Math.round(availableDailyHours * 60)
  const placementDailyMinutes = Math.min(placementMinutesPerDay, dailyBudgetMinutes)
  const academicDailyBudget = Math.max(0, dailyBudgetMinutes - placementDailyMinutes)
  const weeklyAcademicBudget = academicDailyBudget * 7
  const desiredWeeklyMinutes = subjects.reduce((sum, subject) => sum + subject.weeklyMinutes, 0)
  const scalingFactor = desiredWeeklyMinutes > weeklyAcademicBudget && desiredWeeklyMinutes > 0
    ? weeklyAcademicBudget / desiredWeeklyMinutes
    : 1

  let allocatedWeeklyMinutes = 0
  for (const subject of subjects) {
    subject.recommendedWeeklyMinutes = Math.floor(subject.weeklyMinutes * scalingFactor)
    allocatedWeeklyMinutes += subject.recommendedWeeklyMinutes
  }
  let remainingWeeklyMinutes = Math.max(0, weeklyAcademicBudget - allocatedWeeklyMinutes)
  for (const subject of [...subjects].sort((a, b) => b.priorityScore - a.priorityScore)) {
    if (remainingWeeklyMinutes <= 0) break
    const unallocated = subject.weeklyMinutes - subject.recommendedWeeklyMinutes
    const extra = Math.min(remainingWeeklyMinutes, Math.max(0, unallocated))
    subject.recommendedWeeklyMinutes += extra
    remainingWeeklyMinutes -= extra
    allocatedWeeklyMinutes += extra
  }
  for (const subject of subjects) {
    subject.dailyMinutes = Math.floor(subject.recommendedWeeklyMinutes / 7)
    const split = splitMinutes(subject.dailyMinutes, subject.practiceRatio)
    subject.dailyPracticeMinutes = split.practiceMinutes
    subject.dailyRevisionMinutes = split.revisionMinutes
    subject.recommendedWeeklyHours = Number((subject.recommendedWeeklyMinutes / 60).toFixed(1))
    subject.dailyHours = Number((subject.dailyMinutes / 60).toFixed(2))
    subject.allocationExplanation = `${subject.reasons.join(' ')} Priority ${subject.priorityScore}/100 (${subject.priority.toLowerCase()}); ${subject.recommendedWeeklyHours} hours/week allocated${scalingFactor < 1 ? ' after applying your available-time limit' : ''}.`
  }

  const recommendedStudyMinutes = subjects.reduce((sum, subject) => sum + subject.dailyMinutes, 0)
  const totalDailyMinutes = recommendedStudyMinutes + placementDailyMinutes
  const remainingDailyMinutes = Math.max(0, dailyBudgetMinutes - totalDailyMinutes)
  const schedule = createSchedule(subjects, placementDailyMinutes, startTime)
  const dailyPlan = dayNames.map((day) => ({
    day,
    sessions: schedule
  }))

  return {
    generatedAt: new Date(today).toISOString(),
    config: STUDY_TIME_CONFIG,
    availableDailyHours,
    availableDailyMinutes: dailyBudgetMinutes,
    availableWeeklyHours: Number((dailyBudgetMinutes * 7 / 60).toFixed(1)),
    subjects,
    totals: {
      academicDailyMinutes: recommendedStudyMinutes,
      placementDailyMinutes,
      recommendedDailyMinutes: totalDailyMinutes,
      availableDailyMinutes: dailyBudgetMinutes,
      remainingDailyMinutes,
      academicWeeklyHours: Number((allocatedWeeklyMinutes / 60).toFixed(1)),
      placementWeeklyHours: Number((placementDailyMinutes * 7 / 60).toFixed(1)),
      recommendedWeeklyHours: Number((totalDailyMinutes * 7 / 60).toFixed(1)),
      availableWeeklyMinutes: dailyBudgetMinutes * 7,
      remainingWeeklyMinutes: Math.max(0, dailyBudgetMinutes * 7 - totalDailyMinutes * 7),
      revisionDailyMinutes: subjects.reduce((sum, subject) => sum + subject.dailyRevisionMinutes, 0),
      practiceDailyMinutes: subjects.reduce((sum, subject) => sum + subject.dailyPracticeMinutes, 0)
    },
    placementPreparation: {
      dailyMinutes: placementDailyMinutes,
      weeklyHours: Number((placementDailyMinutes * 7 / 60).toFixed(1))
    },
    dailyPlan
  }
}
