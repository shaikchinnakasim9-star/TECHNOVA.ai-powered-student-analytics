const studyTasks = [
  {
    id: 'ml-hierarchical-clustering',
    subject: 'Machine Learning',
    topic: 'Hierarchical Clustering',
    estimatedMinutes: 30,
    keywords: ['hierarchical', 'clustering', 'dendrogram', 'linkage'],
    material: { label: 'ML Unit 5 question paper', url: '/study-materials/ml-unit-5-question-paper.pdf' },
    method: 'Review agglomerative and divisive clustering, then work through the distance and linkage example without looking at the answer. Sketch a dendrogram and explain where you would cut it.'
  },
  {
    id: 'ml-em-clustering',
    subject: 'Machine Learning',
    topic: 'Expectation-Maximization (EM) Clustering',
    estimatedMinutes: 30,
    keywords: ['expectation', 'maximization', 'em', 'gaussian', 'mixture'],
    material: { label: 'ML Unit 5 question paper', url: '/study-materials/ml-unit-5-question-paper.pdf' },
    method: 'Explain the E-step and M-step from memory, then write one iteration for a Gaussian mixture. Finish by comparing soft EM assignments with hard K-Means assignments.'
  },
  {
    id: 'dlco-carry-look-ahead-adder',
    subject: 'DLCO',
    topic: 'Carry Look-Ahead Adder',
    estimatedMinutes: 25,
    keywords: ['carry', 'adder', 'look-ahead', 'lookahead', 'arithmetic'],
    material: { label: 'AIML DLCO question paper', url: '/study-materials/aiml-dlco-question-paper.pdf' },
    method: 'Read the question, derive the generate/propagate carry equations, and draw the logic block from memory. Check each carry expression against your notes.'
  },
  {
    id: 'dlco-memory-hierarchy',
    subject: 'DLCO',
    topic: 'Memory Hierarchy',
    estimatedMinutes: 25,
    keywords: ['memory', 'hierarchy', 'cache', 'storage'],
    material: { label: 'AIML DLCO question paper', url: '/study-materials/aiml-dlco-question-paper.pdf' },
    method: 'Draw the memory hierarchy and label speed, capacity, and cost at each level. Then explain how cache fits into the hierarchy without using your notes.'
  },
  {
    id: 'dlco-dma',
    subject: 'DLCO',
    topic: 'Direct Memory Access (DMA)',
    estimatedMinutes: 20,
    keywords: ['dma', 'direct memory', 'transfer', 'block diagram'],
    material: { label: 'AIML DLCO question paper', url: '/study-materials/aiml-dlco-question-paper.pdf' },
    method: 'Recreate the DMA block diagram, label the controller and data paths, then describe the transfer sequence in three steps.'
  }
]

function includesAny(text, terms) {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim()
  return terms.some((term) => {
    const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(normalized)
  })
}

function getSubjectSignal(task, scores) {
  return scores.find(({ subject }) => includesAny(subject, task.keywords) ||
    (task.subject === 'DLCO' && includesAny(subject, ['digital logic', 'computer organization', 'dlco'])) ||
    (task.subject === 'Machine Learning' && includesAny(subject, ['machine learning', 'deep learning', 'ml', 'aiml', 'ai & ml'])))
}

export function recommendStudyTask({
  student,
  subjectScores = [],
  feedback = [],
  progress = [],
  availableMinutes
}) {
  const scores = [
    ...(Array.isArray(student.subjectScores) ? student.subjectScores : []),
    ...subjectScores
  ].filter((item) => Number.isFinite(Number(item.score)))
  const exams = Array.isArray(student.upcomingExams) ? student.upcomingExams : []
  const assignments = (Array.isArray(student.pendingAssignments) ? student.pendingAssignments : [])
    .filter((assignment) => assignment.status !== 'Completed')
  const completedTaskIds = new Set(progress.filter((record) => record.status === 'Completed').map((record) => record.taskId))
  const latestProgress = progress[0]

  const availableTasks = studyTasks.filter((task) => !completedTaskIds.has(task.id))
  if (availableTasks.length === 0) return null

  const rankedTasks = availableTasks.map((task, index) => {
    let score = 0
    const subjectSignal = getSubjectSignal(task, scores)
    const weakFeedback = feedback.find((report) =>
      report.understanding <= 3 &&
      (includesAny(report.subject, task.keywords) ||
        includesAny(report.notes, task.keywords) ||
        (task.subject === 'DLCO' && includesAny(report.subject, ['digital logic', 'computer organization', 'dlco'])) ||
        (task.subject === 'Machine Learning' && includesAny(report.subject, ['machine learning', 'deep learning', 'ml', 'aiml', 'ai & ml'])))
    )
    const matchingExam = exams
      .filter((exam) => includesAny(exam.subject, task.keywords) ||
        (task.subject === 'DLCO' && includesAny(exam.subject, ['digital logic', 'computer organization', 'dlco'])) ||
        (task.subject === 'Machine Learning' && includesAny(exam.subject, ['machine learning', 'deep learning', 'ml', 'aiml', 'ai & ml'])))
      .map((exam) => ({ exam, daysUntil: (new Date(exam.examDate) - Date.now()) / 86400000 }))
      .filter(({ daysUntil }) => Number.isFinite(daysUntil) && daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)[0]
    const matchingAssignment = assignments.find((assignment) =>
      includesAny(`${assignment.subject} ${assignment.title} ${assignment.topic}`, task.keywords) ||
      (task.subject === 'DLCO' && includesAny(assignment.subject, ['digital logic', 'computer organization', 'dlco'])) ||
      (task.subject === 'Machine Learning' && includesAny(assignment.subject, ['machine learning', 'deep learning', 'ml', 'aiml', 'ai & ml'])))
    const assignmentTopicMatch = matchingAssignment &&
      includesAny(`${matchingAssignment.title} ${matchingAssignment.topic}`, task.keywords)
    const examTopicMatch = matchingExam?.exam?.topics?.some((examTopic) =>
      includesAny(examTopic, task.keywords))
    const estimatedMinutes = Number(matchingAssignment?.estimatedMinutes) > 0
      ? Number(matchingAssignment.estimatedMinutes)
      : task.estimatedMinutes

    if (subjectSignal) score += Math.max(0, 100 - Number(subjectSignal.score)) * 0.3
    if (weakFeedback) score += (6 - weakFeedback.understanding) * 8
    if (matchingExam) score += Math.max(0, 30 - matchingExam.daysUntil) * 1.5
    if (matchingAssignment) {
      score += 15
      if (assignmentTopicMatch) score += 30
      if (matchingAssignment.dueDate) {
        const daysUntilDue = (new Date(matchingAssignment.dueDate) - Date.now()) / 86400000
        if (Number.isFinite(daysUntilDue)) score += daysUntilDue <= 0 ? 20 : Math.max(0, 14 - daysUntilDue)
      } else {
        score += 5
      }
      if (examTopicMatch) score += 25
    }
    score += estimatedMinutes <= availableMinutes ? 12 : (availableMinutes - estimatedMinutes) * 0.5
    if (latestProgress?.taskId === task.id && latestProgress.status !== 'Completed') score += 20

    return { task, index, score, subjectSignal, weakFeedback, matchingExam, matchingAssignment, estimatedMinutes }
  }).sort((a, b) => b.score - a.score || a.index - b.index)

  const selected = rankedTasks[0]
  const task = selected.task
  const duration = Math.min(selected.estimatedMinutes, availableMinutes)
  const reasons = []

  if (selected.matchingExam) {
    const days = Math.max(0, Math.ceil(selected.matchingExam.daysUntil))
    reasons.push(`${task.subject} is in your upcoming exam schedule${days === 0 ? ' (today)' : ` (${days} day${days === 1 ? '' : 's'} away)`}.`)
  }
  if (selected.subjectSignal) reasons.push(`${selected.subjectSignal.subject} is one of your weaker recorded subject marks (${selected.subjectSignal.score}%).`)
  if (selected.weakFeedback) reasons.push(`You reported difficulty with ${selected.weakFeedback.subject} (${selected.weakFeedback.understanding}/5).`)
  if (selected.matchingAssignment) reasons.push(`You have a pending ${selected.matchingAssignment.subject} assignment: ${selected.matchingAssignment.title}.`)
  if (latestProgress?.taskId === task.id && latestProgress.status !== 'Completed') reasons.push('Your last check-in showed this topic still needs work.')
  if (reasons.length === 0) reasons.push('This topic comes from the study materials shared with you and is a focused question-paper review.')

  let topic = task.topic
  if (selected.matchingAssignment?.topic) topic = selected.matchingAssignment.topic
  else if (selected.matchingExam?.exam?.topics?.length) topic = selected.matchingExam.exam.topics.find((examTopic) =>
    includesAny(examTopic, task.keywords)) || selected.matchingExam.exam.topics[0]
  else if (selected.weakFeedback?.notes) topic = `${task.topic}: ${selected.weakFeedback.notes}`

  return {
    taskId: task.id,
    subject: task.subject,
    topic,
    duration,
    priority: 'High',
    explanation: reasons.join(' '),
    method: `${task.method} Use the ${duration}-minute session to focus on one attempt, then check your work.`,
    material: task.material
  }
}

export function isStudyTaskId(taskId) {
  return studyTasks.some((task) => task.id === taskId)
}

export function getStudyTaskDetails(taskId) {
  const task = studyTasks.find((item) => item.id === taskId)
  return task ? { subject: task.subject, topic: task.topic } : null
}
