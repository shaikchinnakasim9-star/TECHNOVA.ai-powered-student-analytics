import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import {
  Announcement,
  CampusEvent,
  CampusNotification,
  CampusSettings,
  EventRegistration,
  MentorRecord,
  Student,
  User
} from '../models/index.js'
import { dbState, users } from '../services/demoDataService.js'
import { isDatabaseConfigured } from '../services/databaseService.js'
import { buildStudentProfile } from '../utils/analytics.js'

const mentorRole = (role) => role === 'Mentor' || role === 'Faculty'
const accountId = (user) => String(user.id || user._id)
const accountIdentifiers = (user = {}) => new Set([
  String(user.id || ''),
  String(user._id || ''),
  String(user.email || ''),
  String(user.name || '')
].filter(Boolean))
const matchesAssignedMentor = (student, user) => {
  if (!student || !user || !mentorRole(user.role)) return false
  const assignedMentorId = String(student.mentorId || '')
  const assignedFaculty = String(student.assignedFaculty || '')
  if (!assignedMentorId && !assignedFaculty) return false
  const identifiers = [...accountIdentifiers(user)].map((value) => String(value).trim()).filter(Boolean)
  return assignedMentorId && identifiers.some((identifier) => identifier && assignedMentorId === identifier)
    || assignedFaculty && identifiers.some((identifier) => identifier && assignedFaculty.toLowerCase() === String(identifier).toLowerCase())
}
const plain = (record) => record?.toObject ? record.toObject() : record
const newId = () => randomBytes(8).toString('hex')
const defaultMentorPermissions = {
  canAddNotes: true,
  canGiveFeedback: true,
  canCreateTasks: true,
  canMessageStudents: true,
  canScheduleSessions: true,
  canManageGoals: true
}
const mentorPermissionForType = {
  Note: 'canAddNotes',
  Feedback: 'canGiveFeedback',
  Task: 'canCreateTasks',
  Message: 'canMessageStudents',
  Session: 'canScheduleSessions',
  Goal: 'canManageGoals'
}

function error(res, status, message) {
  return res.status(status).json({ message })
}

function safeUser(user) {
  if (!user) return null
  const { password, ...safe } = plain(user)
  return { ...safe, id: safe.id || String(safe._id || '') }
}

async function findAccount(id) {
  if (isDatabaseConfigured()) {
    if (/^[a-f\d]{24}$/i.test(String(id))) return User.findById(id).lean()
    return User.findOne({ email: String(id).toLowerCase() }).lean()
  }
  return users.find((user) => accountId(user) === String(id) || user.email.toLowerCase() === String(id).toLowerCase()) || null
}

async function findMentor(id) {
  if (!id) return null
  if (isDatabaseConfigured()) {
    const identity = /^[a-f\d]{24}$/i.test(String(id)) ? { _id: id } : { email: String(id).toLowerCase() }
    return User.findOne({ ...identity, role: { $in: ['Mentor', 'Faculty'] }, status: { $ne: 'Inactive' } }).lean()
  }
  const mentor = await findAccount(id)
  return mentor && mentorRole(mentor.role) && mentor.status !== 'Inactive' ? mentor : null
}

async function findStudent(id) {
  if (isDatabaseConfigured()) {
    const query = /^[a-f\d]{24}$/i.test(String(id))
      ? { $or: [{ studentId: String(id) }, { _id: id }] }
      : { studentId: String(id) }
    return Student.findOne(query).lean()
  }
  return dbState.students.find((student) => student.studentId === String(id) || student.id === String(id)) || null
}

async function allStudents() {
  return isDatabaseConfigured() ? Student.find().lean() : [...dbState.students]
}

async function saveStudent(studentId, update) {
  if (isDatabaseConfigured()) {
    return Student.findOneAndUpdate({ studentId }, { $set: update }, { new: true, runValidators: true }).lean()
  }
  const student = dbState.students.find((item) => item.studentId === studentId)
  if (!student) return null
  Object.assign(student, update, { updatedAt: new Date().toISOString() })
  return student
}

async function saveAccount(user, update) {
  if (!user) return null
  if (isDatabaseConfigured()) return User.findByIdAndUpdate(user._id, { $set: update }, { new: true, runValidators: true }).select('-password').lean()
  Object.assign(user, update)
  return user
}

async function accountForStudent(studentId) {
  if (isDatabaseConfigured()) return User.findOne({ role: 'Student', studentId }).lean()
  return users.find((user) => user.role === 'Student' && user.studentId === studentId) || null
}

async function notify(recipientId, studentId, title, message, type = 'system', priority = 'Information') {
  const record = { recipientId: String(recipientId), studentId, title, message, type, priority }
  if (isDatabaseConfigured()) return CampusNotification.create(record)
  dbState.notifications.unshift({ ...record, id: newId(), createdAt: new Date().toISOString(), readAt: null })
  return null
}

function validateMentorPermissions(input, current = defaultMentorPermissions) {
  const permissions = { ...defaultMentorPermissions, ...current }
  for (const key of Object.keys(defaultMentorPermissions)) {
    if (input?.[key] !== undefined) {
      if (typeof input[key] !== 'boolean') return null
      permissions[key] = input[key]
    }
  }
  return permissions
}

function studentAudienceMatches(announcement, student) {
  const audience = announcement.audience || {}
  if (audience.type === 'Department') return student.department === audience.value
  if (audience.type === 'Year') return String(student.year) === String(audience.value)
  if (audience.type === 'Mentor Group') return String(student.mentorId || '') === String(audience.value)
  return true
}

export async function listMentors(req, res) {
  const mentors = isDatabaseConfigured()
    ? await User.find({ role: { $in: ['Mentor', 'Faculty'] } }).select('-password').lean()
    : users.filter((user) => mentorRole(user.role))
  const students = await allStudents()
  return res.json(mentors.map((mentor) => ({
    ...safeUser(mentor),
    role: 'Mentor',
    assignedStudentCount: students.filter((student) => String(student.mentorId || '') === accountId(mentor)).length
  })))
}

export async function createMentor(req, res) {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(res, 400, 'Provide a mentor name and valid email.')
  if (password && password.length < 8) return error(res, 400, 'Password must contain at least 8 characters.')
  const exists = isDatabaseConfigured()
    ? await User.exists({ email })
    : users.some((user) => user.email.toLowerCase() === email)
  if (exists) return error(res, 409, 'An account already exists with this email.')
  const temporaryPassword = password || randomBytes(9).toString('hex')
  const record = {
    name, email, password: await bcrypt.hash(temporaryPassword, 12), role: 'Mentor',
    department: String(req.body?.department || '').trim(),
    phone: String(req.body?.phone || '').trim(), status: 'Active',
    mentorPermissions: validateMentorPermissions(req.body?.mentorPermissions)
  }
  if (!record.mentorPermissions) return error(res, 400, 'Mentor permissions must be boolean values.')
  const mentor = isDatabaseConfigured()
    ? await User.create(record)
    : { ...record, id: `mentor-${newId()}`, createdAt: new Date().toISOString() }
  if (!isDatabaseConfigured()) users.push(mentor)
  return res.status(201).json({ mentor: safeUser(mentor), temporaryPassword })
}

export async function updateMentor(req, res) {
  const mentor = await findAccount(req.params.id)
  if (!mentor || !mentorRole(mentor.role)) return error(res, 404, 'Mentor not found.')
  const update = {}
  for (const field of ['name', 'department', 'phone']) {
    if (req.body?.[field] !== undefined) update[field] = String(req.body[field]).trim()
  }
  if (req.body?.status !== undefined) {
    if (!['Active', 'Inactive'].includes(req.body.status)) return error(res, 400, 'Choose Active or Inactive status.')
    if (req.body.status === 'Inactive') {
      const assigned = (await allStudents()).some((student) => String(student.mentorId || '') === accountId(mentor) && student.status !== 'Inactive')
      if (assigned) return error(res, 409, 'Reassign or deactivate this mentor’s students first.')
    }
    update.status = req.body.status
  }
  if (req.body?.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(res, 400, 'Enter a valid email address.')
    const duplicate = isDatabaseConfigured()
      ? await User.exists({ email, _id: { $ne: mentor._id } })
      : users.some((item) => item.email.toLowerCase() === email && accountId(item) !== accountId(mentor))
    if (duplicate) return error(res, 409, 'An account already exists with this email.')
    update.email = email
  }
  if (req.body?.password) {
    const password = String(req.body.password)
    if (password.length < 8) return error(res, 400, 'Password must contain at least 8 characters.')
    update.password = await bcrypt.hash(password, 12)
  }
  if (req.body?.mentorPermissions !== undefined) {
    const permissions = validateMentorPermissions(req.body.mentorPermissions, mentor.mentorPermissions)
    if (!permissions) return error(res, 400, 'Mentor permissions must be boolean values.')
    update.mentorPermissions = permissions
  }
  return res.json({ mentor: safeUser(await saveAccount(mentor, update)) })
}

export async function deactivateMentor(req, res) {
  const mentor = await findAccount(req.params.id)
  if (!mentor || !mentorRole(mentor.role)) return error(res, 404, 'Mentor not found.')
  const assigned = (await allStudents()).some((student) =>
    String(student.mentorId || '') === accountId(mentor) && student.status !== 'Inactive')
  if (assigned) return error(res, 409, 'Reassign or deactivate this mentor’s students first.')
  return res.json({ mentor: safeUser(await saveAccount(mentor, { status: 'Inactive' })) })
}

export async function listStudents(req, res) {
  let students = await allStudents()
  if (req.user.role === 'Student') students = students.filter((student) => student.studentId === req.user.studentId)
  else if (mentorRole(req.user.role)) students = students.filter((student) => String(student.mentorId || '') === String(req.user.id) && student.status !== 'Inactive')
  return res.json(students.map((student) => buildStudentProfile({ ...student, id: student.studentId })))
}

export async function createStudent(req, res) {
  const name = String(req.body?.name || '').trim()
  const studentId = String(req.body?.studentId || '').trim().toUpperCase()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const year = Number(req.body?.year)
  const password = String(req.body?.password || '')
  if (!name || !studentId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(res, 400, 'Name, student ID, and valid email are required.')
  if (!Number.isInteger(year) || year < 1 || year > 8) return error(res, 400, 'Year must be a valid number.')
  if (password && password.length < 8) return error(res, 400, 'Password must contain at least 8 characters.')
  const idTaken = isDatabaseConfigured() ? await Student.exists({ studentId }) : dbState.students.some((item) => item.studentId === studentId)
  const emailTaken = isDatabaseConfigured() ? await User.exists({ email }) : users.some((item) => item.email.toLowerCase() === email)
  if (idTaken) return error(res, 409, 'That student ID already exists.')
  if (emailTaken) return error(res, 409, 'An account already exists with this email.')
  const mentor = req.body?.mentorId ? await findMentor(req.body.mentorId) : null
  if (req.body?.mentorId && !mentor) return error(res, 400, 'Choose an active mentor.')
  const temporaryPassword = password || randomBytes(9).toString('hex')
  const student = {
    studentId, name, email, year, department: String(req.body?.department || '').trim(),
    mentorId: mentor ? accountId(mentor) : undefined, assignedFaculty: mentor?.name || '',
    status: 'Active', riskLevel: 'LOW', successScore: 0, academicPerformance: 0,
    attendance: 0, lmsActivity: 0, assignmentCompletion: 0, cgpa: 0
  }
  const account = {
    name, email, password: await bcrypt.hash(temporaryPassword, 12),
    role: 'Student', studentId, department: student.department, status: 'Active'
  }
  let savedStudent
  let savedAccount
  if (isDatabaseConfigured()) {
    savedStudent = await Student.create(student)
    try {
      savedAccount = await User.create(account)
    } catch (createError) {
      await Student.deleteOne({ studentId })
      throw createError
    }
  } else {
    savedStudent = { ...student, id: studentId, createdAt: new Date().toISOString() }
    savedAccount = { ...account, id: `student-account-${studentId}`, createdAt: new Date().toISOString() }
    dbState.students.push(savedStudent)
    users.push(savedAccount)
  }
  if (mentor) {
    await notify(accountId(mentor), studentId, 'New student assigned to you', `${name} (${studentId}) has been assigned to your student group.`, 'assignment')
    await notify(accountId(savedAccount), studentId, 'Your mentor assignment', `You have been assigned to Mentor ${mentor.name}.`, 'assignment')
  }
  return res.status(201).json({ student: buildStudentProfile({ ...plain(savedStudent), id: studentId }), temporaryPassword })
}

export async function updateStudent(req, res) {
  const student = await findStudent(req.params.id)
  if (!student) return error(res, 404, 'Student not found.')
  const update = {}
  for (const field of ['name', 'department']) {
    if (req.body?.[field] !== undefined) update[field] = String(req.body[field]).trim()
  }
  if (req.body?.year !== undefined) {
    const year = Number(req.body.year)
    if (!Number.isInteger(year) || year < 1 || year > 8) return error(res, 400, 'Year must be a valid number.')
    update.year = year
  }
  if (req.body?.status !== undefined) {
    if (!['Active', 'Inactive'].includes(req.body.status)) return error(res, 400, 'Choose Active or Inactive status.')
    update.status = req.body.status
  }
  const oldMentorId = String(student.mentorId || '')
  let newMentor = null
  if (req.body?.mentorId !== undefined) {
    newMentor = req.body.mentorId ? await findMentor(req.body.mentorId) : null
    if (req.body.mentorId && !newMentor) return error(res, 400, 'Choose an active mentor.')
    const newMentorId = newMentor ? accountId(newMentor) : ''
    update.mentorId = newMentorId || undefined
    update.assignedFaculty = newMentor?.name || ''
  }
  if (req.body?.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(res, 400, 'Enter a valid email address.')
    const linkedAccount = await accountForStudent(student.studentId)
    const duplicate = isDatabaseConfigured()
      ? await User.exists({ email, _id: { $ne: linkedAccount?._id } })
      : users.some((user) => user.email.toLowerCase() === email && user.studentId !== student.studentId)
    if (duplicate) return error(res, 409, 'An account already exists with this email.')
    update.email = email
  }
  const saved = await saveStudent(student.studentId, update)
  const linkedAccount = await accountForStudent(student.studentId)
  if (linkedAccount) {
    const accountUpdate = { ...update }
    delete accountUpdate.mentorId
    delete accountUpdate.assignedFaculty
    await saveAccount(linkedAccount, accountUpdate)
  }
  if (req.body?.mentorId !== undefined) {
    const nextMentorId = newMentor ? accountId(newMentor) : ''
    if (oldMentorId !== nextMentorId) {
      const oldMentor = oldMentorId ? await findAccount(oldMentorId) : null
      if (oldMentor) await notify(accountId(oldMentor), student.studentId, 'Student reassigned', `${student.name} has been reassigned to another mentor.`, 'assignment')
      if (newMentor) await notify(accountId(newMentor), student.studentId, 'New student assigned to you', `${student.name} (${student.studentId}) has been assigned to your student group.`, 'assignment')
      if (linkedAccount) {
        const detail = newMentor ? `Your assigned mentor is now ${newMentor.name}.` : 'Your mentor assignment has been removed.'
        await notify(accountId(linkedAccount), student.studentId, 'Your mentor has been updated', detail, 'assignment')
      }
    }
  }
  return res.json({ student: buildStudentProfile({ ...saved, id: student.studentId }) })
}

export async function deactivateStudent(req, res) {
  const student = await findStudent(req.params.id)
  if (!student) return error(res, 404, 'Student not found.')
  const saved = await saveStudent(student.studentId, { status: 'Inactive' })
  const linkedAccount = await accountForStudent(student.studentId)
  if (linkedAccount) await saveAccount(linkedAccount, { status: 'Inactive' })
  return res.json({ student: buildStudentProfile({ ...saved, id: student.studentId }) })
}

async function eventList() {
  return isDatabaseConfigured() ? CampusEvent.find().sort({ date: 1 }).lean() : [...dbState.events]
}

export async function getEvents(req, res) {
  let events = await eventList()
  if (req.user.role === 'Student') {
    const student = await findStudent(req.user.studentId)
    events = student ? events.filter((event) => event.published
      && (event.department === 'All' || event.department === student.department)
      && (event.year === 'All' || String(event.year) === String(student.year))) : []
  } else if (mentorRole(req.user.role)) {
    events = events.filter((event) => event.published)
  }
  return res.json(events)
}

function validateEvent(body) {
  const title = String(body?.title || '').trim()
  const description = String(body?.description || '').trim()
  const date = new Date(body?.date)
  const time = String(body?.time || '').trim()
  const location = String(body?.location || '').trim()
  if (!title || title.length > 120 || !description || description.length > 3000 || !Number.isFinite(date.getTime()) || !time || !location) {
    return { error: 'Provide a title, description, valid date, time, and location or online link.' }
  }
  if (body?.imageUrl && !/^https?:\/\/.+/i.test(String(body.imageUrl))) return { error: 'Event image must be a valid HTTP or HTTPS URL.' }
  if (body?.published !== undefined && typeof body.published !== 'boolean') return { error: 'Published must be a boolean value.' }
  const registrationDeadline = body.registrationDeadline ? new Date(body.registrationDeadline) : undefined
  if (registrationDeadline && !Number.isFinite(registrationDeadline.getTime())) return { error: 'Registration deadline must be a valid date.' }
  return { event: {
    title, description, date, time, location,
    imageUrl: String(body.imageUrl || ''),
    department: String(body.department || 'All'),
    year: String(body.year || 'All'),
    registrationDeadline: registrationDeadline || null,
    published: body.published === true
  } }
}

export async function createEvent(req, res) {
  const result = validateEvent(req.body)
  if (result.error) return error(res, 400, result.error)
  const event = { ...result.event, createdBy: req.user.id }
  if (isDatabaseConfigured()) return res.status(201).json(await CampusEvent.create(event))
  const saved = { ...event, id: newId(), createdAt: new Date().toISOString() }
  dbState.events.push(saved)
  return res.status(201).json(saved)
}

export async function updateEvent(req, res) {
  const result = validateEvent(req.body)
  if (result.error) return error(res, 400, result.error)
  let saved
  if (isDatabaseConfigured()) {
    saved = await CampusEvent.findByIdAndUpdate(req.params.id, result.event, { new: true, runValidators: true }).lean()
  } else {
    const event = dbState.events.find((item) => item.id === req.params.id || item._id === req.params.id)
    if (event) Object.assign(event, result.event, { updatedAt: new Date().toISOString() })
    saved = event
  }
  return saved ? res.json(saved) : error(res, 404, 'Event not found.')
}

export async function deleteEvent(req, res) {
  let deleted
  if (isDatabaseConfigured()) deleted = await CampusEvent.findByIdAndDelete(req.params.id).lean()
  else {
    deleted = dbState.events.find((item) => item.id === req.params.id || item._id === req.params.id)
    if (deleted) dbState.events = dbState.events.filter((item) => item !== deleted)
  }
  return deleted ? res.json({ message: 'Event deleted.' }) : error(res, 404, 'Event not found.')
}

async function eventById(id) {
  if (isDatabaseConfigured()) return CampusEvent.findById(id).lean()
  return dbState.events.find((item) => item.id === id || item._id === id) || null
}

async function studentRegistrations(studentId) {
  if (isDatabaseConfigured()) return EventRegistration.find({ studentId, status: 'Registered' }).lean()
  return dbState.eventRegistrations.filter((item) => item.studentId === studentId && item.status === 'Registered')
}

export async function getMyEventRegistrations(req, res) {
  const registrations = await studentRegistrations(req.user.studentId)
  return res.json(registrations.map(({ eventId, status, registeredAt }) => ({ eventId, status, registeredAt })))
}

export async function registerForEvent(req, res) {
  const event = await eventById(req.params.id)
  if (!event || !event.published) return error(res, 404, 'Published event not found.')
  const student = await findStudent(req.user.studentId)
  if (!student || student.status === 'Inactive') return error(res, 404, 'Student not found.')
  if ((event.department !== 'All' && event.department !== student.department)
    || (event.year !== 'All' && String(event.year) !== String(student.year))) {
    return error(res, 403, 'This event is not available to your student group.')
  }
  const deadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null
  const deadlineEnd = deadline
    ? Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate(), 23, 59, 59, 999)
    : null
  if (deadlineEnd !== null && deadlineEnd < Date.now()) {
    return error(res, 409, 'The registration deadline for this event has passed.')
  }
  const eventDate = new Date(event.date)
  const eventEnd = Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate(), 23, 59, 59, 999)
  if (eventEnd < Date.now()) return error(res, 409, 'This event has already ended.')
  const eventId = String(event._id || event.id)
  let registration
  if (isDatabaseConfigured()) {
    registration = await EventRegistration.findOneAndUpdate(
      { eventId, studentId: student.studentId },
      { $set: { status: 'Registered', registeredAt: new Date() } },
      { upsert: true, new: true, runValidators: true }
    ).lean()
  } else {
    registration = dbState.eventRegistrations.find((item) => item.eventId === eventId && item.studentId === student.studentId)
    if (registration) Object.assign(registration, { status: 'Registered', registeredAt: new Date().toISOString() })
    else {
      registration = { id: newId(), eventId, studentId: student.studentId, status: 'Registered', registeredAt: new Date().toISOString() }
      dbState.eventRegistrations.push(registration)
    }
  }
  return res.status(201).json(registration)
}

export async function cancelEventRegistration(req, res) {
  const event = await eventById(req.params.id)
  if (!event) return error(res, 404, 'Event not found.')
  const eventId = String(event._id || event.id)
  let registration
  if (isDatabaseConfigured()) {
    registration = await EventRegistration.findOneAndUpdate(
      { eventId, studentId: req.user.studentId, status: 'Registered' },
      { $set: { status: 'Cancelled' } },
      { new: true }
    ).lean()
  } else {
    registration = dbState.eventRegistrations.find((item) =>
      item.eventId === eventId && item.studentId === req.user.studentId && item.status === 'Registered')
    if (registration) registration.status = 'Cancelled'
  }
  return registration ? res.json(registration) : error(res, 404, 'Active event registration not found.')
}

export async function getEventRegistrations(req, res) {
  const event = await eventById(req.params.id)
  if (!event) return error(res, 404, 'Event not found.')
  const eventId = String(event._id || event.id)
  const registrations = isDatabaseConfigured()
    ? await EventRegistration.find({ eventId, status: 'Registered' }).sort({ registeredAt: 1 }).lean()
    : dbState.eventRegistrations.filter((item) => item.eventId === eventId && item.status === 'Registered')
  const students = await allStudents()
  return res.json(registrations.map((registration) => {
    const student = students.find((item) => item.studentId === registration.studentId)
    return {
      ...registration,
      student: student ? { studentId: student.studentId, name: student.name, email: student.email } : null
    }
  }))
}

export async function getAnnouncements(req, res) {
  const announcements = isDatabaseConfigured()
    ? await Announcement.find({ published: true }).sort({ createdAt: -1 }).lean()
    : dbState.announcements.filter((item) => item.published)
  if (req.user.role !== 'Student') return res.json(announcements)
  const student = await findStudent(req.user.studentId)
  return res.json(student ? announcements.filter((item) => studentAudienceMatches(item, student)) : [])
}

export async function createAnnouncement(req, res) {
  const title = String(req.body?.title || '').trim()
  const message = String(req.body?.message || '').trim()
  const priority = req.body?.priority || 'Information'
  const type = req.body?.audience?.type || 'All Students'
  const value = String(req.body?.audience?.value || '').trim()
  if (!title || title.length > 120 || !message || message.length > 3000) return error(res, 400, 'Title and message are required.')
  if (!['Information', 'Attention', 'Urgent Support'].includes(priority)) return error(res, 400, 'Choose a valid priority.')
  if (!['All Students', 'Department', 'Year', 'Mentor Group'].includes(type)) return error(res, 400, 'Choose a valid target audience.')
  if (type !== 'All Students' && !value) return error(res, 400, 'Choose a value for the target audience.')
  if (type === 'Mentor Group' && !(await findMentor(value))) return error(res, 400, 'Choose an active mentor group.')
  const record = { title, message, priority, audience: { type, value }, published: true, createdBy: req.user.id }
  const saved = isDatabaseConfigured()
    ? await Announcement.create(record)
    : { ...record, id: newId(), createdAt: new Date().toISOString() }
  if (!isDatabaseConfigured()) dbState.announcements.unshift(saved)
  const students = (await allStudents()).filter((student) => student.status !== 'Inactive' && studentAudienceMatches(saved, student))
  const studentIds = new Set(students.map((student) => student.studentId))
  const recipients = isDatabaseConfigured()
    ? await User.find({ role: 'Student', studentId: { $in: [...studentIds] }, status: { $ne: 'Inactive' } }).select('_id studentId').lean()
    : users.filter((user) => user.role === 'Student' && studentIds.has(user.studentId) && user.status !== 'Inactive')
  for (const recipient of recipients) {
    await notify(accountId(recipient), recipient.studentId, title, message, 'announcement', priority)
  }
  return res.status(201).json(saved)
}

async function userAliases(user) {
  const ids = [String(user.id)]
  const account = user.email ? await findAccount(user.email) : null
  if (account) ids.push(accountId(account))
  return [...new Set(ids)]
}

export async function getNotifications(req, res) {
  const ids = await userAliases(req.user)
  const notifications = isDatabaseConfigured()
    ? await CampusNotification.find({ recipientId: { $in: ids } }).sort({ createdAt: -1 }).limit(100).lean()
    : dbState.notifications.filter((item) => ids.includes(String(item.recipientId))).slice(0, 100)
  return res.json(notifications)
}

export async function markNotificationRead(req, res) {
  const ids = await userAliases(req.user)
  if (isDatabaseConfigured()) {
    const saved = await CampusNotification.findOneAndUpdate(
      { _id: req.params.id, recipientId: { $in: ids } }, { $set: { readAt: new Date() } }, { new: true }
    ).lean()
    return saved ? res.json(saved) : error(res, 404, 'Notification not found.')
  }
  const saved = dbState.notifications.find((item) => item.id === req.params.id && ids.includes(String(item.recipientId)))
  if (!saved) return error(res, 404, 'Notification not found.')
  saved.readAt = new Date().toISOString()
  return res.json(saved)
}

export async function getMyMentor(req, res) {
  const student = await findStudent(req.user.studentId)
  if (!student) return error(res, 404, 'Your student profile could not be found.')
  const mentor = student.mentorId ? await findAccount(student.mentorId) : null
  const records = student.mentorId
    ? isDatabaseConfigured()
      ? await MentorRecord.find({ studentId: student.studentId, mentorId: String(student.mentorId) }).sort({ createdAt: -1 }).lean()
      : dbState.mentorRecords.filter((item) => item.studentId === student.studentId && item.mentorId === String(student.mentorId))
    : []
  return res.json({
    studentId: student.studentId,
    mentor: mentor ? { id: accountId(mentor), name: mentor.name, email: mentor.email, department: mentor.department, phone: mentor.phone } : null,
    records
  })
}

export async function getMentorStudents(req, res) {
  const students = (await allStudents()).filter((student) =>
    matchesAssignedMentor(student, req.user) && student.status !== 'Inactive')
  return res.json(students.map((student) => buildStudentProfile({ ...student, id: student.studentId })))
}

async function scopedStudent(studentId, user) {
  const student = await findStudent(studentId)
  if (!student) return null
  if (student.status === 'Inactive' && user.role !== 'Admin') return null
  if (user.role === 'Student' && student.studentId !== user.studentId) return null
  if (mentorRole(user.role) && !matchesAssignedMentor(student, user)) return null
  return student
}

export async function getMentorRecords(req, res) {
  const student = await scopedStudent(req.params.studentId, req.user)
  if (!student) return error(res, 404, 'Student not found.')
  const mentorId = String(student.mentorId || '')
  const records = isDatabaseConfigured()
    ? await MentorRecord.find({ studentId: student.studentId, mentorId }).sort({ createdAt: -1 }).lean()
    : dbState.mentorRecords.filter((item) => item.studentId === student.studentId && item.mentorId === mentorId)
  return res.json(records)
}

export async function createMentorRecord(req, res) {
  const student = await scopedStudent(req.params.studentId, req.user)
  if (!student) return error(res, 404, 'Student not found.')
  const type = String(req.body?.type || '')
  const title = String(req.body?.title || '').trim()
  const message = String(req.body?.message || '').trim()
  const studentMessage = req.user.role === 'Student' && type === 'Message'
  if (!studentMessage && !mentorRole(req.user.role)) return error(res, 403, 'You cannot create this mentoring record.')
  if (!(studentMessage || Object.hasOwn(mentorPermissionForType, type))) return error(res, 400, 'Choose a valid mentoring record type.')
  if (!title || title.length > 120 || !message || message.length > 3000) return error(res, 400, 'A title and message are required.')
  const mentorId = String(student.mentorId || '')
  if (!mentorId) return error(res, 409, 'This student does not have an assigned mentor.')
  const mentor = await findAccount(mentorId)
  if (!mentor || mentor.status === 'Inactive') return error(res, 409, 'The assigned mentor account is inactive.')
  if (!studentMessage && mentor?.mentorPermissions?.[mentorPermissionForType[type]] === false) {
    return error(res, 403, 'Your administrator has disabled this mentoring action.')
  }
  const dueDate = req.body?.dueDate ? new Date(req.body.dueDate) : undefined
  if (dueDate && !Number.isFinite(dueDate.getTime())) return error(res, 400, 'Enter a valid task or session date.')
  const data = {
    studentId: student.studentId, mentorId, type, title, message,
    dueDate,
    status: 'Open', createdByRole: studentMessage ? 'Student' : 'Mentor'
  }
  const saved = isDatabaseConfigured()
    ? await MentorRecord.create(data)
    : { ...data, id: newId(), createdAt: new Date().toISOString() }
  if (!isDatabaseConfigured()) dbState.mentorRecords.unshift(saved)
  const recipient = studentMessage ? mentor : await accountForStudent(student.studentId)
  if (recipient) {
    await notify(accountId(recipient), student.studentId, studentMessage ? 'New student message' : `New mentor ${type.toLowerCase()}`, `${student.name}: ${title}`, 'message')
  }
  return res.status(201).json(saved)
}

export async function updateMentorRecord(req, res) {
  let record = isDatabaseConfigured()
    ? await MentorRecord.findById(req.params.id).lean()
    : dbState.mentorRecords.find((item) => item.id === req.params.id)
  if (!record) return error(res, 404, 'Mentoring record not found.')
  const student = await scopedStudent(record.studentId, req.user)
  if (!student) return error(res, 404, 'Mentoring record not found.')
  const status = req.body?.status
  if (!['Task', 'Goal'].includes(record.type) || !['Open', 'In Progress', 'Completed'].includes(status)) return error(res, 400, 'Only a task or goal status can be updated.')
  if (isDatabaseConfigured()) {
    record = await MentorRecord.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).lean()
  } else {
    record.status = status
    record.updatedAt = new Date().toISOString()
  }
  return res.json(record)
}

export async function getStaffAudienceOptions(req, res) {
  const mentors = isDatabaseConfigured()
    ? await User.find({ role: { $in: ['Mentor', 'Faculty'] }, status: { $ne: 'Inactive' } }).select('name email department').lean()
    : users.filter((user) => mentorRole(user.role) && user.status !== 'Inactive')
  const students = await allStudents()
  return res.json({
    departments: [...new Set(students.map((student) => student.department).filter(Boolean))],
    mentors: mentors.map((mentor) => ({ id: accountId(mentor), name: mentor.name, email: mentor.email }))
  })
}

export async function getPlatformSettings(req, res) {
  if (isDatabaseConfigured()) {
    const settings = await CampusSettings.findOne({ key: 'platform' }).lean()
    return res.json(settings || { chatbotEnabled: true, assistantWelcome: 'Hi! Ask about your progress or request support.' })
  }
  return res.json(dbState.settings)
}

export async function getChatbotConfig(req, res) {
  const settings = isDatabaseConfigured()
    ? await CampusSettings.findOne({ key: 'platform' }).select('chatbotEnabled assistantWelcome').lean()
    : dbState.settings
  return res.json({
    chatbotEnabled: settings?.chatbotEnabled !== false,
    assistantWelcome: settings?.assistantWelcome || 'Hi! Ask about your progress or request support.'
  })
}

export async function updatePlatformSettings(req, res) {
  const chatbotEnabled = req.body?.chatbotEnabled
  const assistantWelcome = String(req.body?.assistantWelcome || '').trim()
  if (typeof chatbotEnabled !== 'boolean') return error(res, 400, 'Choose whether the AI assistant is enabled.')
  if (!assistantWelcome || assistantWelcome.length > 500) return error(res, 400, 'Welcome message must be between 1 and 500 characters.')
  const update = { chatbotEnabled, assistantWelcome, updatedBy: req.user.id }
  if (isDatabaseConfigured()) {
    const settings = await CampusSettings.findOneAndUpdate(
      { key: 'platform' },
      { $set: update, $setOnInsert: { key: 'platform' } },
      { upsert: true, new: true, runValidators: true }
    ).lean()
    return res.json(settings)
  }
  Object.assign(dbState.settings, update, { updatedAt: new Date().toISOString() })
  return res.json(dbState.settings)
}
