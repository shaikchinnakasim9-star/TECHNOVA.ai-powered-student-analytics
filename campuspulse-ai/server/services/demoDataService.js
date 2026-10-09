import { calculateSuccessScore, calculateRiskLevel, calculatePlacementReadiness, calculateEngagementScore, calculateRiskFactors } from '../utils/analytics.js'

const departments = ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'AI & DS']
const years = [1, 2, 3, 4]
const riskLabels = ['LOW', 'MEDIUM', 'HIGH']

export const users = [
  { id: 'u1', name: 'Admin User', email: 'admin@campuspulse.ai', password: 'Admin@123', role: 'Admin' },
  { id: 'u2', name: 'Faculty User', email: 'faculty@campuspulse.ai', password: 'Faculty@123', role: 'Faculty' },
  { id: 'u3', name: 'Haa Ramya', email: 'ramya@gmail.com', password: '12345678', role: 'Student', studentId: 'STU1000' }
]

const generateNumericRange = (min, max, bias = 0) => {
  const amplitude = max - min
  return Number((min + (Math.random() * amplitude + bias)).toFixed(1))
}

const generateStudent = (index) => {
  const department = departments[index % departments.length]
  const year = years[Math.floor(Math.random() * years.length)]
  const attendance = generateNumericRange(52, 96, 0)
  const academicPerformance = generateNumericRange(42, 96, 0)
  const lmsActivity = generateNumericRange(35, 97, 0)
  const assignmentCompletion = generateNumericRange(40, 96, 0)
  const placementReadiness = generateNumericRange(25, 96, 0)
  const engagement = generateNumericRange(30, 96, 0)
  const skills = generateNumericRange(36, 96, 0)
  const aptitudeScore = generateNumericRange(24, 96, 0)
  const codingScore = generateNumericRange(20, 98, 0)
  const communicationScore = generateNumericRange(30, 94, 0)
  const mockInterviewScore = generateNumericRange(20, 92, 0)
  const resumeScore = generateNumericRange(28, 96, 0)
  const projects = generateNumericRange(20, 100, 0)
  const hackathons = generateNumericRange(15, 100, 0)
  const clubs = generateNumericRange(15, 100, 0)
  const events = generateNumericRange(10, 100, 0)
  const certifications = generateNumericRange(15, 100, 0)
  const workshops = generateNumericRange(15, 100, 0)
  const cgpa = Number((Math.random() * 3.2 + 5).toFixed(2))
  const successScore = calculateSuccessScore({
    academicPerformance,
    attendance,
    lmsActivity,
    assignmentCompletion,
    placementReadiness,
    engagement,
    skills
  })

  const student = {
    id: `stu-${String(index + 1).padStart(4, '0')}`,
    studentId: `STU${1000 + index}`,
    name: `Student ${index + 1}`,
    email: `student${index + 1}@campuspulse.ai`,
    department,
    year,
    semester: Math.min(8, Math.max(1, year * 2 - 1 + (index % 2))),
    gender: index % 2 === 0 ? 'Female' : 'Male',
    riskLevel: calculateRiskLevel(successScore),
    successScore,
    academicPerformance,
    attendance,
    lmsActivity,
    assignmentCompletion,
    placementReadiness,
    engagement,
    skills,
    aptitudeScore,
    codingScore,
    communicationScore,
    mockInterviewScore,
    resumeScore,
    projects,
    hackathons,
    clubs,
    events,
    certifications,
    workshops,
    cgpa,
    courseProgress: Math.min(100, Math.max(35, lmsActivity - 5)),
    assignmentMissed: Math.max(0, Math.round((100 - assignmentCompletion) / 10)),
    lastLogin: '2026-10-01',
    trend: {
      academic: 'STABLE',
      attendance: 'STABLE',
      placement: 'IMPROVING'
    },
    riskFactors: calculateRiskFactors({ attendance, assignmentCompletion, placementReadiness, lmsActivity, academicPerformance }),
    placementReadinessScore: calculatePlacementReadiness({ aptitudeScore, codingScore, communicationScore, mockInterviewScore, resumeScore }),
    engagementScore: calculateEngagementScore({ hackathons, clubs, events, certifications, workshops, projects })
  }

  return student
}

export function generateDemoStudents(count = 500) {
  const students = Array.from({ length: count }, (_, index) => generateStudent(index))

  const highRiskCount = Math.min(30, Math.max(20, Math.round(count * 0.04)))
  for (let i = 0; i < highRiskCount; i += 1) {
    const student = students[i]
    student.attendance = Math.min(student.attendance, 52)
    student.assignmentCompletion = Math.min(student.assignmentCompletion, 46)
    student.academicPerformance = Math.min(student.academicPerformance, 52)
    student.placementReadiness = Math.min(student.placementReadiness, 42)
    student.riskLevel = 'HIGH'
    student.successScore = Math.min(student.successScore, 58)
  }

  return students
}

export const demoStudents = generateDemoStudents()
demoStudents[0].name = 'Haa Ramya'
demoStudents[0].email = 'ramya@gmail.com'

export function getDashboardSummary(students = demoStudents) {
  const totalStudents = students.length
  const atRisk = students.filter((student) => student.riskLevel === 'HIGH').length
  const averageSuccess = students.reduce((sum, student) => sum + student.successScore, 0) / totalStudents
  const placementReady = students.filter((student) => student.placementReadinessScore >= 70).length
  const attendanceAverage = students.reduce((sum, student) => sum + student.attendance, 0) / totalStudents
  const interventionsRequired = students.filter((student) => student.riskLevel !== 'LOW').length

  return {
    totalStudents,
    atRisk,
    averageSuccessScore: Number(averageSuccess.toFixed(1)),
    placementReady: Number(((placementReady / totalStudents) * 100).toFixed(1)),
    attendanceAverage: Number(attendanceAverage.toFixed(1)),
    interventionsRequired
  }
}

export function getRiskDistribution(students = demoStudents) {
  const groups = { LOW: 0, MEDIUM: 0, HIGH: 0 }
  students.forEach((student) => {
    groups[student.riskLevel] += 1
  })

  const total = students.length || 1
  return Object.entries(groups).map(([key, value]) => ({
    name: key,
    value,
    percent: Number(((value / total) * 100).toFixed(1)),
    color: key === 'LOW' ? '#22c55e' : key === 'MEDIUM' ? '#f59e0b' : '#ef4444'
  }))
}

export function getDepartmentAnalysis(students = demoStudents) {
  return departments.map((department) => {
    const deptStudents = students.filter((student) => student.department === department)
    const averageCGPA = deptStudents.reduce((sum, student) => sum + student.cgpa, 0) / (deptStudents.length || 1)
    const averageAttendance = deptStudents.reduce((sum, student) => sum + student.attendance, 0) / (deptStudents.length || 1)
    const averageSuccess = deptStudents.reduce((sum, student) => sum + student.successScore, 0) / (deptStudents.length || 1)
    const placementReadiness = deptStudents.reduce((sum, student) => sum + student.placementReadinessScore, 0) / (deptStudents.length || 1)
    const atRiskPercentage = (deptStudents.filter((student) => student.riskLevel === 'HIGH').length / (deptStudents.length || 1)) * 100

    return {
      department,
      averageCGPA: Number(averageCGPA.toFixed(2)),
      averageAttendance: Number(averageAttendance.toFixed(1)),
      averageSuccessScore: Number(averageSuccess.toFixed(1)),
      placementReadiness: Number(placementReadiness.toFixed(1)),
      atRiskPercentage: Number(atRiskPercentage.toFixed(1))
    }
  })
}

export function getTopRiskStudents(students = demoStudents) {
  return [...students].sort((a, b) => a.successScore - b.successScore).slice(0, 10).map((student) => ({
    ...student,
    topRiskFactor: student.riskFactors[0]?.name || 'Academic performance',
    action: 'View'
  }))
}

export function getTrendSeries(students = demoStudents) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return months.map((month, index) => ({
    month,
    success: Number((65 + index * 2 + Math.random() * 8).toFixed(1)),
    risk: Number((23 - index * 1.5 + Math.random() * 4).toFixed(1)),
    attendance: Number((72 + index * 1.5 + Math.random() * 6).toFixed(1)),
    placement: Number((54 + index * 2.5 + Math.random() * 7).toFixed(1))
  }))
}

export function getSegments(students = demoStudents) {
  return [
    { name: 'High Academic / Low Placement', count: students.filter((student) => student.academicPerformance > 75 && student.placementReadiness < 55).length, averageSuccessScore: 78, averageCGPA: 8.5, averageAttendance: 80, placementReadiness: 45, recommendation: 'Career-readiness coaching' },
    { name: 'Low Academic / High Engagement', count: students.filter((student) => student.academicPerformance < 60 && student.engagement > 80).length, averageSuccessScore: 58, averageCGPA: 6.2, averageAttendance: 72, placementReadiness: 52, recommendation: 'Academic support plan' },
    { name: 'Low Attendance / High Academic', count: students.filter((student) => student.attendance < 65 && student.academicPerformance > 75).length, averageSuccessScore: 68, averageCGPA: 8.2, averageAttendance: 59, placementReadiness: 63, recommendation: 'Attendance monitoring' },
    { name: 'High Performers', count: students.filter((student) => student.successScore >= 80).length, averageSuccessScore: 87, averageCGPA: 8.9, averageAttendance: 90, placementReadiness: 82, recommendation: 'Leadership mentorship' },
    { name: 'Overall At Risk', count: students.filter((student) => student.riskLevel === 'HIGH').length, averageSuccessScore: 51, averageCGPA: 6.3, averageAttendance: 66, placementReadiness: 41, recommendation: 'Intervention bundle' },
    { name: 'Placement Ready', count: students.filter((student) => student.placementReadinessScore >= 70).length, averageSuccessScore: 80, averageCGPA: 8.4, averageAttendance: 85, placementReadiness: 78, recommendation: 'Mock interview and resume coaching' },
    { name: 'Low Engagement', count: students.filter((student) => student.engagement < 50).length, averageSuccessScore: 60, averageCGPA: 7.3, averageAttendance: 71, placementReadiness: 48, recommendation: 'Club and event participation' }
  ]
}

export function getRiskTable(students = demoStudents) {
  return [...students]
    .sort((a, b) => a.successScore - b.successScore)
    .slice(0, 25)
    .map((student) => ({
      ...student,
      topRiskFactor: student.riskFactors[0]?.name || 'Academic trend',
      priority: student.riskLevel,
      riskScore: student.successScore
    }))
}

export function getInterventions() {
  return [
    { id: 'int-1', student: 'STU1024', riskType: 'Attendance', priority: 'HIGH', recommendation: 'Faculty mentoring', assignedFaculty: 'Prof. Rao', createdDate: '2026-09-21', dueDate: '2026-09-28', status: 'Open', notes: 'Needs mentoring and attendance plan' },
    { id: 'int-2', student: 'STU2041', riskType: 'Placement', priority: 'MEDIUM', recommendation: 'Aptitude practice', assignedFaculty: 'Dr. Mehta', createdDate: '2026-09-18', dueDate: '2026-09-30', status: 'In Progress', notes: 'Ongoing aptitude prep' }
  ]
}

export const dbState = {
  students: demoStudents,
  interventions: getInterventions(),
  events: [],
  eventRegistrations: [],
  announcements: [],
  notifications: [],
  mentorRecords: [],
  settings: { chatbotEnabled: true, assistantWelcome: 'Hi! Ask about your progress, request a study task, or say “show my timetable” to view your personalized weekly plan.' },
  subjectFeedback: [],
  skillAssessments: [],
  feedback: [],
  studyProgress: [],
  studyPlans: [],
  riskAssessments: [],
  earlySuccessChecks: [],
  earlySuccessNotifications: [],
  users
}
