import { dbState } from '../services/demoDataService.js'
import { Student } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'

export async function importData(req, res) {
  const payload = req.body || {}
  const data = Array.isArray(payload.records) ? payload.records : []
  const validRecords = data.filter((record) => record && record.studentId)
  const invalidRecords = data.length - validRecords.length
  const duplicateRecords = validRecords.filter((record, index) => validRecords.findIndex((item) => item.studentId === record.studentId) !== index).length
  const uniqueRecords = validRecords.filter((record, index) => validRecords.findIndex((item) => item.studentId === record.studentId) === index)

  if (isDatabaseConfigured() && uniqueRecords.length > 0) {
    const writes = uniqueRecords.map(({ studentId, ...record }) => ({
      updateOne: {
        filter: { studentId: String(studentId).trim() },
        update: { $set: record, $setOnInsert: { studentId: String(studentId).trim() } },
        upsert: true
      }
    }))
    await Student.bulkWrite(writes, { ordered: false })
    dbState.students = (await Student.find().lean()).map((student) => ({ ...student, id: student.studentId }))
  }

  const importResult = {
    uploadedFile: payload.fileName || 'demo-import.json',
    records: data.length,
    validRecords: validRecords.length,
    invalidRecords,
    duplicateRecords,
    warnings: duplicateRecords > 0 ? ['Duplicate student IDs found and skipped.'] : [],
    importedAt: new Date().toISOString()
  }

  return res.json(importResult)
}
