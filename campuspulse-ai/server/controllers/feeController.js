import { dbState, users } from '../services/demoDataService.js'
import { FeeRecord, Student } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'

function getFeeRecord(student, index) {
  const tuitionFee = 60000 + (student.year * 5000)
  const activityFee = 5000
  const examinationFee = 3000
  const totalFee = tuitionFee + activityFee + examinationFee
  const paymentRatio = [1, 0.75, 0.5, 0][index % 4]
  const paidAmount = Math.round(totalFee * paymentRatio)

  return {
    studentId: student.studentId,
    studentName: student.name,
    department: student.department,
    year: student.year,
    academicYear: '2026–27',
    tuitionFee,
    activityFee,
    examinationFee,
    totalFee,
    paidAmount,
    balance: totalFee - paidAmount,
    status: paidAmount === totalFee ? 'Paid' : paidAmount === 0 ? 'Unpaid' : 'Partially Paid',
    dueDate: '2026-11-30'
  }
}

export async function getFeeDetails(req, res) {
  if (isDatabaseConfigured()) {
    const studentId = req.user.role === 'Student'
      ? req.user.studentId || users.find((entry) => entry.id === req.user.id || entry.email === req.user.email)?.studentId
      : null
    if (req.user.role === 'Student' && !studentId) {
      return res.status(404).json({ message: 'Your student record could not be found.' })
    }

    const query = studentId ? { studentId } : {}
    const storedRecords = await FeeRecord.find(query).sort({ studentId: 1 }).lean()
    const studentIds = storedRecords.map((record) => record.studentId)
    const students = await Student.find({ studentId: { $in: studentIds } }).select('studentId name department year').lean()
    const studentsById = new Map(students.map((student) => [student.studentId, student]))
    const records = storedRecords.map((record) => {
      const student = studentsById.get(record.studentId)
      const totalFee = record.tuitionFee + (record.activityFee || 0) + (record.examinationFee || 0)
      const balance = totalFee - record.paidAmount
      return {
        ...record,
        activityFee: record.activityFee || 0,
        examinationFee: record.examinationFee || 0,
        studentName: student?.name || record.studentId,
        department: student?.department || '—',
        year: student?.year,
        totalFee,
        balance,
        status: balance <= 0 ? 'Paid' : record.paidAmount <= 0 ? 'Unpaid' : 'Partially Paid'
      }
    })
    const totalFees = records.reduce((total, record) => total + record.totalFee, 0)
    const totalPaid = records.reduce((total, record) => total + (record.paidAmount || 0), 0)
    const totalBalance = totalFees - totalPaid
    return res.json({
      data: records,
      summary: {
        totalFees,
        totalPaid,
        totalBalance,
        unpaidAccounts: records.filter((record) => record.balance > 0).length,
        studentCount: records.length
      },
      demoData: false
    })
  }

  let students = dbState.students

  if (req.user.role === 'Student') {
    const user = users.find((entry) => entry.id === req.user.id || entry.email === req.user.email)
    if (!user?.studentId) {
      return res.status(404).json({ message: 'Your student record could not be found.' })
    }
    students = students.filter((student) => student.studentId === user.studentId)
    if (students.length === 0) {
      return res.status(404).json({ message: 'Your student record could not be found.' })
    }
  }

  const records = students.map((student) => {
    const index = dbState.students.indexOf(student)
    return getFeeRecord(student, index)
  })
  const totalFees = records.reduce((total, record) => total + record.totalFee, 0)
  const totalPaid = records.reduce((total, record) => total + record.paidAmount, 0)
  const totalBalance = totalFees - totalPaid
  const unpaidAccounts = records.filter((record) => record.balance > 0).length

  return res.json({
    data: records,
    summary: { totalFees, totalPaid, totalBalance, unpaidAccounts, studentCount: records.length },
    demoData: true
  })
}
