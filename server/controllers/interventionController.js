import { dbState } from '../services/demoDataService.js'
import { Intervention } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'

function serializeIntervention(record) {
  const intervention = record.toObject ? record.toObject() : record
  return { ...intervention, id: intervention._id?.toString() || intervention.id, student: intervention.studentId || intervention.student }
}

export async function getInterventions(req, res) {
  if (isDatabaseConfigured()) {
    const records = await Intervention.find().sort({ createdAt: -1 }).lean()
    return res.json(records.map(serializeIntervention))
  }
  return res.json(dbState.interventions)
}

export async function createIntervention(req, res) {
  const payload = req.body || {}
  const intervention = {
    id: `int-${Date.now()}`,
    student: payload.student || 'STU0000',
    riskType: payload.riskType || 'Attendance',
    priority: payload.priority || 'HIGH',
    recommendation: payload.recommendation || 'Faculty mentoring',
    assignedFaculty: payload.assignedFaculty || 'Prof. Rao',
    createdDate: new Date().toISOString().slice(0, 10),
    dueDate: payload.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: payload.status || 'Open',
    notes: payload.notes || 'Follow-up required',
    actionTaken: payload.actionTaken || '',
    studentResponse: payload.studentResponse || '',
    followUpDate: payload.followUpDate || payload.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    riskBeforeIntervention: payload.riskBeforeIntervention == null ? null : Number(payload.riskBeforeIntervention),
    outcomeRiskScore: payload.outcomeRiskScore == null ? null : Number(payload.outcomeRiskScore),
    outcome: payload.outcome || '',
    outcomeAssessment: payload.outcomeAssessment || 'Not Yet Reviewed',
    outcomeReviewedAt: payload.outcomeAssessment && payload.outcomeAssessment !== 'Not Yet Reviewed' ? new Date() : null
  }

  if (!['Open', 'In Progress', 'Completed', 'Escalated'].includes(intervention.status)) {
    return res.status(400).json({ message: 'Choose a valid intervention status.' })
  }
  if (!['Improved', 'No Change', 'Needs More Support', 'Not Yet Reviewed'].includes(intervention.outcomeAssessment)) {
    return res.status(400).json({ message: 'Choose a valid outcome assessment.' })
  }
  for (const field of ['riskBeforeIntervention', 'outcomeRiskScore']) {
    if (intervention[field] !== null && (!Number.isFinite(intervention[field]) || intervention[field] < 0 || intervention[field] > 100)) {
      return res.status(400).json({ message: `${field} must be a number from 0 to 100.` })
    }
  }

  if (isDatabaseConfigured()) {
    const record = await Intervention.create({
      studentId: intervention.student,
      riskType: intervention.riskType,
      priority: intervention.priority,
      recommendation: intervention.recommendation,
      assignedFaculty: intervention.assignedFaculty,
      createdDate: intervention.createdDate,
      dueDate: intervention.dueDate,
      status: intervention.status,
      notes: intervention.notes,
      actionTaken: intervention.actionTaken,
      studentResponse: intervention.studentResponse,
      followUpDate: intervention.followUpDate,
      riskBeforeIntervention: intervention.riskBeforeIntervention,
      outcomeRiskScore: intervention.outcomeRiskScore,
      outcome: intervention.outcome,
      outcomeAssessment: intervention.outcomeAssessment,
      outcomeReviewedAt: intervention.outcomeReviewedAt
    })
    const saved = serializeIntervention(record)
    dbState.interventions.unshift(saved)
    return res.status(201).json(saved)
  }

  dbState.interventions.unshift(intervention)
  return res.status(201).json(intervention)
}

export async function updateIntervention(req, res) {
  const { id } = req.params
  const body = req.body || {}
  const update = {}
  const editableFields = [
    'status',
    'actionTaken',
    'studentResponse',
    'followUpDate',
    'riskBeforeIntervention',
    'outcomeRiskScore',
    'outcome',
    'outcomeAssessment'
  ]
  for (const field of editableFields) {
    if (body[field] !== undefined) update[field] = body[field]
  }
  if (update.status !== undefined && !['Open', 'In Progress', 'Completed', 'Escalated'].includes(update.status)) {
    return res.status(400).json({ message: 'Choose a valid intervention status.' })
  }
  if (update.outcomeAssessment !== undefined && !['Improved', 'No Change', 'Needs More Support', 'Not Yet Reviewed'].includes(update.outcomeAssessment)) {
    return res.status(400).json({ message: 'Choose a valid outcome assessment.' })
  }
  for (const field of ['riskBeforeIntervention', 'outcomeRiskScore']) {
    if (update[field] === '' || update[field] === null) {
      update[field] = null
      continue
    }
    if (update[field] !== undefined) {
      update[field] = Number(update[field])
      if (!Number.isFinite(update[field]) || update[field] < 0 || update[field] > 100) {
        return res.status(400).json({ message: `${field} must be a number from 0 to 100.` })
      }
    }
  }
  if (update.outcomeAssessment && update.outcomeAssessment !== 'Not Yet Reviewed') {
    update.outcomeReviewedAt = new Date()
  } else if (update.outcomeAssessment === 'Not Yet Reviewed') {
    update.outcomeReviewedAt = null
  }

  if (isDatabaseConfigured()) {
    const record = await Intervention.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
    if (!record) return res.status(404).json({ message: 'Intervention not found' })
    const saved = serializeIntervention(record)
    const index = dbState.interventions.findIndex((item) => item.id === id)
    if (index >= 0) dbState.interventions[index] = saved
    return res.json(saved)
  }

  const index = dbState.interventions.findIndex((item) => item.id === id)
  if (index === -1) return res.status(404).json({ message: 'Intervention not found' })

  dbState.interventions[index] = { ...dbState.interventions[index], ...update }
  return res.json(dbState.interventions[index])
}
