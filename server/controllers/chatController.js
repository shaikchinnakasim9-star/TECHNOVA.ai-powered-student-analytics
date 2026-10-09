import { dbState, getDashboardSummary, users } from '../services/demoDataService.js'
import { generateStudentInsight } from '../services/aiRecommendationService.js'
import { buildStudentProfile } from '../utils/analytics.js'
import { CampusSettings, Student } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'
import { createStudyRecommendation } from './studyController.js'
import { getStudyPlanData } from './studyPlanController.js'

export async function postChatMessage(req, res) {
  const settings = isDatabaseConfigured()
    ? await CampusSettings.findOne({ key: 'platform' }).lean()
    : dbState.settings
  if (settings?.chatbotEnabled === false) {
    return res.status(503).json({ message: 'The AI assistant is temporarily unavailable. Contact your mentor for support.' })
  }
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message || message.length > 500) {
    return res.status(400).json({ message: 'Enter a message of 1 to 500 characters.' })
  }

  const timetableIntent = /\b(time[\s-]?table|schedule)\b/i.test(message)
  const branchMatch = message.match(/\b(AIML|AI\s*&\s*ML|CSE|ECE)\b/i)
  if (req.user.role === 'Student' && (timetableIntent || /\b(my\s+)?study\s+plan\b/i.test(message))) {
    const studyPlan = await getStudyPlanData(req.user)
    if (!studyPlan) {
      return res.status(404).json({ message: 'Your student record could not be found.' })
    }
    if (!studyPlan.plan) {
      const studyTask = await createStudyRecommendation(studyPlan.studentId, 30)
      return res.json({
        reply: 'I could not build a personalized weekly timetable yet because your subject marks are not recorded. Add your subjects and current scores on the Study Plan page; meanwhile, here is a focused task from your available study materials.',
        timetable: { type: 'study', unavailable: true },
        studyTask
      })
    }
    return res.json({
      reply: `Here is your personalized weekly study timetable${studyPlan.studentName ? `, ${studyPlan.studentName}` : ''}. It is based on your saved subjects, priorities, and available study time.`,
      timetable: {
        type: 'study',
        dailyPlan: studyPlan.plan.dailyPlan,
        totals: studyPlan.plan.totals,
        startTime: studyPlan.settings.startTime,
        availableDailyHours: studyPlan.settings.availableDailyHours
      }
    })
  }
  if (timetableIntent) {
    if (!branchMatch) {
      return res.json({
        reply: 'Which branch timetable would you like to view?',
        options: ['CSE', 'AIML', 'ECE']
      })
    }

    const branch = branchMatch[0].toUpperCase().replace(/\s+/g, '')
    if (branch === 'AIML' || branch === 'AI&ML') {
      return res.json({
        reply: 'Here is the AIML timetable you provided.',
        timetable: { branch: 'AIML', imageUrl: '/timetables/aiml-timetable.jpg' }
      })
    }

    return res.json({
      reply: `I don't have the ${branch} timetable image yet. Please provide it and I can add it here.`,
      timetable: { branch, unavailable: true }
    })
  }

  const studentIdMatch = message.match(/\bSTU\d+\b/i)
  const user = users.find((entry) => entry.id === req.user.id || entry.email === req.user.email)
  let student

  if (req.user.role === 'Student') {
    const ownStudentId = req.user.studentId || user?.studentId
    if (studentIdMatch && studentIdMatch[0].toUpperCase() !== ownStudentId) {
      return res.json({ reply: 'For privacy, I can only help with your own student progress. Ask me about your score, attendance, or recommendations.' })
    }
    student = isDatabaseConfigured()
      ? await Student.findOne({ studentId: ownStudentId }).lean()
      : dbState.students.find((entry) => entry.studentId === ownStudentId)
    if (!student) {
      return res.status(404).json({ message: 'Your student record could not be found.' })
    }
    if (/\b(study now|what should i study|what to study|study task|best use of my study time)\b/i.test(message)) {
      const availableMinutes = Number(req.body?.availableMinutes || 30)
      const studyTask = await createStudyRecommendation(ownStudentId, availableMinutes)
      return res.json({
        reply: studyTask ? 'Based on your progress and the study materials, here is the most useful task to do now.' : 'You have completed all currently shared study tasks. Add more materials or update your progress to get another recommendation.',
        studyTask
      })
    }
  } else if (studentIdMatch) {
    student = isDatabaseConfigured()
      ? await Student.findOne({ studentId: studentIdMatch[0].toUpperCase() }).lean()
      : dbState.students.find((entry) => entry.studentId.toUpperCase() === studentIdMatch[0].toUpperCase())
    if (!student) {
      return res.json({ reply: `I couldn't find a student with ID ${studentIdMatch[0].toUpperCase()}. Check the ID and try again.` })
    }
  }

  const normalizedMessage = message.toLowerCase()
  if (student) {
    const profile = buildStudentProfile(student)
    if (/\b(insight|recommend\w*|what should|how to improve|help)\b/.test(normalizedMessage)) {
      const insight = generateStudentInsight(student)
      return res.json({ reply: `${insight.summary} Recommended next steps: ${insight.recommendations.join('; ')}.` })
    }
    return res.json({
      reply: `${profile.name} (${profile.studentId}) is currently at ${profile.riskLevel.toLowerCase()} risk with a success score of ${profile.successScore}/100. Attendance is ${profile.attendance}%, academic performance is ${profile.academicPerformance}%, and engagement is ${profile.engagementScore}%. Ask for recommendations if you'd like next steps.`
    })
  }

  if (req.user.role === 'Student') {
    return res.json({ reply: 'I can help with your student progress, attendance, success score, and recommendations. Ask “How am I doing?” or include your student ID.' })
  }

  if (/\b(event|fest|hackathons?|engagement)\b/.test(normalizedMessage)) {
    return res.json({ reply: 'Open Engagement in the sidebar to browse campus events, fests, and hackathons, filter by type, and register your interest.' })
  }

  if (/\b(risk|at risk|dashboard|summary|overall|student count)\b/.test(normalizedMessage)) {
    const students = isDatabaseConfigured() ? await Student.find().lean() : dbState.students
    const summary = getDashboardSummary(students)
    return res.json({
      reply: `The dashboard currently tracks ${summary.totalStudents} students. ${summary.atRisk} are high risk, average success score is ${summary.averageSuccessScore}/100, and average attendance is ${summary.attendanceAverage}%.`
    })
  }

  return res.json({
    reply: 'I can answer questions about dashboard risk and attendance, student progress (include a student ID), recommendations, or campus events. What would you like to know?'
  })
}
