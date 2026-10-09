import { dbState, getTopRiskStudents, getRiskTable, users } from '../services/demoDataService.js'
import { SkillAssessment, Student, User } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'
import { buildStudentProfile } from '../utils/analytics.js'
import { generateStudentInsight } from '../services/aiRecommendationService.js'

function mentorIdentitySet(user = {}) {
  return new Set([
    String(user.id || ''),
    String(user._id || ''),
    String(user.email || ''),
    String(user.name || '')
  ].filter(Boolean))
}

function isStudentAssignedToMentor(student, user) {
  if (!student || !user || !['Mentor', 'Faculty'].includes(user.role)) return false
  const identifiers = mentorIdentitySet(user)
  const assignedMentorId = String(student.mentorId || '')
  const assignedFaculty = String(student.assignedFaculty || '')
  return assignedMentorId && [...identifiers].some((identifier) => identifier && assignedMentorId === identifier)
    || (assignedFaculty && [...identifiers].some((identifier) => identifier && assignedFaculty.toLowerCase() === String(identifier).toLowerCase()))
}

async function resolveStudentId(user) {
  if (user.studentId) return user.studentId
  const knownUser = users.find((entry) => entry.id === user.id || entry.email === user.email)
  if (knownUser?.studentId) return knownUser.studentId
  if (!isDatabaseConfigured()) return null
  const record = await User.findOne({ email: user.email }).select('studentId').lean()
  return record?.studentId || null
}

async function loadStudentForUser(req, res) {
  const requestedId = String(req.params.id || '')
  if (req.user.role === 'Student') {
    const ownStudentId = await resolveStudentId(req.user)
    if (!ownStudentId) {
      res.status(404).json({ message: 'Your student record could not be found.' })
      return null
    }
    if (requestedId !== ownStudentId) {
      res.status(404).json({ message: 'Student not found.' })
      return null
    }
    return isDatabaseConfigured()
      ? Student.findOne({ studentId: ownStudentId }).lean()
      : dbState.students.find((entry) => entry.studentId === ownStudentId) || null
  }

  if (req.user.role === 'Mentor' || req.user.role === 'Faculty') {
    const assignedStudent = isDatabaseConfigured()
      ? await Student.findOne({ studentId: requestedId, status: { $ne: 'Inactive' } }).lean()
      : dbState.students.find((entry) => entry.studentId === requestedId && entry.status !== 'Inactive') || null
    if (!assignedStudent) return null
    return isStudentAssignedToMentor(assignedStudent, req.user) ? assignedStudent : null
  }

  if (isDatabaseConfigured()) {
    if (/^[a-f\d]{24}$/i.test(requestedId)) {
      return Student.findOne({ $or: [{ studentId: requestedId }, { _id: requestedId }] }).lean()
    }
    return Student.findOne({ studentId: requestedId }).lean()
  }
  return dbState.students.find((entry) => entry.studentId === requestedId || entry.id === requestedId) || null
}

export async function getStudents(req, res) {
  const { department, year, risk, minScore, maxScore, search, page = 1, limit = 20 } = req.query
  let students
  if (req.user.role === 'Student') {
    const ownStudentId = await resolveStudentId(req.user)
    if (!ownStudentId) return res.status(404).json({ message: 'Your student record could not be found.' })
    const ownStudent = isDatabaseConfigured()
      ? await Student.findOne({ studentId: ownStudentId }).lean()
      : dbState.students.find((student) => student.studentId === ownStudentId)
    if (!ownStudent) return res.status(404).json({ message: 'Your student record could not be found.' })
    students = [{ ...ownStudent, id: ownStudent.studentId }]
  } else if (req.user.role === 'Mentor' || req.user.role === 'Faculty') {
    students = isDatabaseConfigured()
      ? (await Student.find({ status: { $ne: 'Inactive' } }).lean()).filter((student) => isStudentAssignedToMentor(student, req.user)).map((student) => ({ ...student, id: student.studentId }))
      : dbState.students.filter((student) => isStudentAssignedToMentor(student, req.user) && student.status !== 'Inactive')
  } else {
    students = isDatabaseConfigured()
      ? (await Student.find().lean()).map((student) => ({ ...student, id: student.studentId }))
      : [...dbState.students]
  }

  if (department) students = students.filter((student) => student.department.toLowerCase() === String(department).toLowerCase())
  if (year) students = students.filter((student) => String(student.year) === String(year))
  if (risk) students = students.filter((student) => student.riskLevel.toLowerCase() === String(risk).toLowerCase())
  if (minScore) students = students.filter((student) => student.successScore >= Number(minScore))
  if (maxScore) students = students.filter((student) => student.successScore <= Number(maxScore))
  if (search) {
    const keyword = String(search).toLowerCase()
    students = students.filter((student) =>
      student.name.toLowerCase().includes(keyword) ||
      student.studentId.toLowerCase().includes(keyword) ||
      student.department.toLowerCase().includes(keyword) ||
      student.email.toLowerCase().includes(keyword)
    )
  }

  const total = students.length
  const pageNumber = Number(page)
  const limitNumber = Number(limit)
  const paginated = students.slice((pageNumber - 1) * limitNumber, pageNumber * limitNumber)

  res.json({
    total,
    page: pageNumber,
    limit: limitNumber,
    pages: Math.ceil(total / limitNumber) || 1,
    data: paginated.map((student) => buildStudentProfile(student))
  })
}

export async function getStudentById(req, res) {
  const student = await loadStudentForUser(req, res)
  if (res.headersSent) return
  if (!student) return res.status(404).json({ message: 'Student not found' })

  const skillAssessment = isDatabaseConfigured()
    ? await SkillAssessment.findOne({ studentId: student.studentId }).sort({ updatedAt: -1 }).lean()
    : dbState.skillAssessments?.find((assessment) => assessment.studentId === student.studentId) || null

  return res.json(buildStudentProfile({
    ...student,
    id: student.studentId,
    skillAssessment: skillAssessment ? {
      technical: skillAssessment.technical || [],
      softSkills: skillAssessment.softSkills || [],
      assessedAt: skillAssessment.updatedAt || skillAssessment.createdAt || null
    } : null
  }))
}

export async function saveStudentTechnicalSkills(req, res) {
  if (req.user.role !== 'Student') {
    return res.status(403).json({ message: 'Technical skills can only be updated by the student.' })
  }
  const ownStudentId = await resolveStudentId(req.user)
  if (!ownStudentId) {
    return res.status(404).json({ message: 'Your student record could not be found.' })
  }
  if (req.params.id !== ownStudentId) {
    return res.status(404).json({ message: 'Student not found.' })
  }

  function validateSkills(entries, label) {
    if (!Array.isArray(entries) || entries.length > 25) {
      return { error: `Submit up to 25 ${label.toLowerCase()} skills.` }
    }
    const skills = []
    const names = new Set()
    for (const entry of entries) {
      const skill = typeof entry?.skill === 'string' ? entry.skill.trim() : ''
      const score = entry?.score === '' || entry?.score == null ? NaN : Number(entry.score)
      if (skill.length < 2 || skill.length > 60) {
        return { error: `Each ${label.toLowerCase()} skill name must be between 2 and 60 characters.` }
      }
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return { error: `Enter a proficiency score from 0 to 100 for ${skill}.` }
      }
      const normalized = skill.toLocaleLowerCase()
      if (names.has(normalized)) {
        return { error: `The ${label.toLowerCase()} skill "${skill}" is listed more than once.` }
      }
      names.add(normalized)
      skills.push({ skill, score })
    }
    return { skills }
  }

  const existing = isDatabaseConfigured()
    ? await SkillAssessment.findOne({ studentId: ownStudentId }).sort({ updatedAt: -1 }).lean()
    : dbState.skillAssessments.find((assessment) => assessment.studentId === ownStudentId)
  const technicalResult = req.body?.technical === undefined
    ? { skills: existing?.technical || [] }
    : validateSkills(req.body.technical, 'Technical')
  if (technicalResult.error) return res.status(400).json({ message: technicalResult.error })
  const softSkillsResult = req.body?.softSkills === undefined
    ? { skills: existing?.softSkills || [] }
    : validateSkills(req.body.softSkills, 'Soft')
  if (softSkillsResult.error) return res.status(400).json({ message: softSkillsResult.error })
  const update = {
    studentId: ownStudentId,
    technical: technicalResult.skills,
    softSkills: softSkillsResult.skills
  }

  if (isDatabaseConfigured()) {
    const saved = await SkillAssessment.findOneAndUpdate(
      { studentId: ownStudentId },
      { $set: update },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean()
    return res.json({
      technical: saved.technical || [],
      softSkills: saved.softSkills || [],
      assessedAt: saved.updatedAt || saved.createdAt || null
    })
  }

  const now = new Date().toISOString()
  const index = dbState.skillAssessments.findIndex((assessment) => assessment.studentId === ownStudentId)
  const saved = { ...existing, ...update, updatedAt: now, createdAt: existing?.createdAt || now }
  if (index >= 0) dbState.skillAssessments[index] = saved
  else dbState.skillAssessments.push(saved)
  return res.json({
    technical: saved.technical,
    softSkills: saved.softSkills,
    assessedAt: saved.updatedAt
  })
}

export async function getStudentScore(req, res) {
  const student = await loadStudentForUser(req, res)
  if (res.headersSent) return
  if (!student) return res.status(404).json({ message: 'Student not found' })

  return res.json({
    studentId: student.studentId,
    successScore: student.successScore,
    riskLevel: student.riskLevel,
    breakdown: {
      academic: student.academicPerformance,
      attendance: student.attendance,
      lms: student.lmsActivity,
      assignments: student.assignmentCompletion,
      placement: student.placementReadiness,
      engagement: student.engagement,
      skills: student.skills
    }
  })
}

export async function getStudentInsights(req, res) {
  const student = await loadStudentForUser(req, res)
  if (res.headersSent) return
  if (!student) return res.status(404).json({ message: 'Student not found' })

  return res.json(generateStudentInsight(student))
}

export async function getRiskStudents(req, res) {
  const students = isDatabaseConfigured() ? await Student.find().lean() : dbState.students
  return res.json(getTopRiskStudents(students))
}

export async function getSegments(req, res) {
  const students = isDatabaseConfigured() ? await Student.find().lean() : dbState.students
  const segments = []
  const groups = [
    { name: 'High Academic / Low Placement', filter: (student) => student.academicPerformance > 75 && student.placementReadiness < 55 },
    { name: 'Low Academic / High Engagement', filter: (student) => student.academicPerformance < 60 && student.engagement > 80 },
    { name: 'Low Attendance / High Academic', filter: (student) => student.attendance < 65 && student.academicPerformance > 75 },
    { name: 'High Performers', filter: (student) => student.successScore >= 80 },
    { name: 'Overall At Risk', filter: (student) => student.riskLevel === 'HIGH' },
    { name: 'Placement Ready', filter: (student) => student.placementReadinessScore >= 70 },
    { name: 'Low Engagement', filter: (student) => student.engagement < 50 }
  ]

  groups.forEach((group) => {
    const groupStudents = students.filter(group.filter)
    segments.push({
      name: group.name,
      count: groupStudents.length,
      averageSuccessScore: Number((groupStudents.reduce((sum, student) => sum + student.successScore, 0) / (groupStudents.length || 1)).toFixed(1)),
      averageCGPA: Number((groupStudents.reduce((sum, student) => sum + student.cgpa, 0) / (groupStudents.length || 1) || 0).toFixed(2)),
      averageAttendance: Number((groupStudents.reduce((sum, student) => sum + student.attendance, 0) / (groupStudents.length || 1) || 0).toFixed(1)),
      placementReadiness: Number((groupStudents.reduce((sum, student) => sum + student.placementReadinessScore, 0) / (groupStudents.length || 1) || 0).toFixed(1)),
      recommendation: 'Targeted intervention' 
    })
  })

  return res.json(segments)
}

export async function getRiskTableData(req, res) {
  const students = isDatabaseConfigured() ? await Student.find().lean() : dbState.students
  res.json(getRiskTable(students))
}
