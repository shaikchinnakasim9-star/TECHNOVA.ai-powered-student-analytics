import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User, Student, Intervention, SubjectFeedback } from '../models/index.js'
import { dbState, demoStudents, users } from './demoDataService.js'

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1
}

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim())
}

function serializeStudent(student) {
  const record = student.toObject ? student.toObject() : student
  return { ...record, id: record.studentId, _id: record._id?.toString() }
}

function serializeUser(user) {
  const record = user.toObject ? user.toObject() : user
  return { ...record, id: record._id?.toString() }
}

function serializeIntervention(intervention) {
  const record = intervention.toObject ? intervention.toObject() : intervention
  return {
    ...record,
    id: record._id?.toString(),
    student: record.studentId
  }
}

function serializeSubjectFeedback(feedback) {
  const record = feedback.toObject ? feedback.toObject() : feedback
  return { ...record, id: record._id?.toString() }
}

export async function initializeDatabase() {
  const studentCount = await Student.countDocuments()
  if (studentCount === 0) {
    const students = demoStudents.map(({ id, ...student }) => student)
    await Student.insertMany(students, { ordered: false })
    console.log(`Seeded MongoDB with ${students.length} demo student records.`)
  } else {
    const ramyaRecord = { ...demoStudents[0] }
    delete ramyaRecord.id
    await Student.updateOne(
      { studentId: 'STU1000' },
      { $setOnInsert: ramyaRecord, $set: { name: 'Haa Ramya', email: 'ramya@gmail.com' } },
      { upsert: true }
    )
  }

  for (const user of users) {
    await User.updateOne(
      { email: user.email.toLowerCase() },
      { $setOnInsert: { ...user, password: await bcrypt.hash(user.password, 12), email: user.email.toLowerCase() } },
      { upsert: true, runValidators: true }
    )
  }

  const storedPasswordRecords = await User.find().select('_id password').lean()
  for (const record of storedPasswordRecords) {
    if (!/^\$2[aby]\$/.test(record.password || '')) {
      await User.updateOne({ _id: record._id }, { $set: { password: await bcrypt.hash(String(record.password || ''), 12) } })
    }
  }

  const storedUsers = (await User.find().lean()).map(serializeUser)
  users.splice(0, users.length, ...storedUsers)
  dbState.users = users
  dbState.students = (await Student.find().lean()).map(serializeStudent)
  dbState.interventions = (await Intervention.find().sort({ createdAt: -1 }).lean()).map(serializeIntervention)
  dbState.subjectFeedback = (await SubjectFeedback.find().sort({ createdAt: -1 }).lean()).map(serializeSubjectFeedback)
}
