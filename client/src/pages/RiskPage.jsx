import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const categoryLabels = {
  academic: 'Academic',
  attendance: 'Attendance',
  assignments: 'Assignments',
  engagement: 'Engagement',
  learning: 'Learning gap',
  administrative: 'Administrative',
  performanceTrend: 'Performance trend'
}

function formatScore(value) {
  return value == null ? 'Not available' : `${Math.round(value)}%`
}

function formatDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString()
}

function riskTone(level) {
  if (level === 'Critical') return 'bg-rose-100 text-rose-800'
  if (level === 'High') return 'bg-orange-100 text-orange-800'
  if (level === 'Moderate') return 'bg-amber-100 text-amber-800'
  if (level === 'Low') return 'bg-emerald-100 text-emerald-800'
  return 'bg-slate-100 text-slate-600'
}

function CategoryBar({ name, score }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-slate-700">{categoryLabels[name] || name}</span>
        <span className="text-slate-500">{formatScore(score)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${score == null ? 'bg-slate-300' : score > 60 ? 'bg-rose-500' : score > 30 ? 'bg-amber-400' : 'bg-emerald-500'}`}
          style={{ width: `${score == null ? 0 : Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  )
}

function RiskDetail({ assessment, studentView, onCreateIntervention, onRecordAssessment, onUpdateIntervention, onMeasureOutcome, saving }) {
  const [showInterventionForm, setShowInterventionForm] = useState(false)
  const [intervention, setIntervention] = useState({
    assignedFaculty: '',
    followUpDate: '',
    recommendation: '',
    notes: ''
  })
  const [outcomeEdits, setOutcomeEdits] = useState({})
  const { student, history, trend, prediction } = assessment
  const selectedRecommendation = assessment.recommendations[0]?.action || 'Supportive mentor check-in'

  useEffect(() => {
    setIntervention((current) => ({ ...current, recommendation: selectedRecommendation }))
    setShowInterventionForm(false)
    setOutcomeEdits({})
  }, [student.studentId, selectedRecommendation])

  const saveNewIntervention = async (event) => {
    event.preventDefault()
    try {
      await onCreateIntervention(student.studentId, assessment, intervention)
      setShowInterventionForm(false)
    } catch (requestError) {
      return
    }
  }

  const saveOutcome = async (item) => {
    const edits = outcomeEdits[item.id] || {}
    await onUpdateIntervention(item.id, {
      status: edits.status || item.status,
      actionTaken: edits.actionTaken ?? item.actionTaken ?? '',
      studentResponse: edits.studentResponse ?? item.studentResponse ?? '',
      followUpDate: edits.followUpDate || item.followUpDate || '',
      outcomeRiskScore: edits.outcomeRiskScore === '' || edits.outcomeRiskScore == null
        ? item.outcomeRiskScore
        : Number(edits.outcomeRiskScore),
      outcome: edits.outcome ?? item.outcome ?? ''
    })
  }

  const measureOutcome = async (item) => {
    await onMeasureOutcome(student.studentId, item)
  }

  const updateOutcome = (item, key, value) => {
    setOutcomeEdits((current) => ({
      ...current,
      [item.id]: { ...current[item.id], [key]: value }
    }))
  }

  const change = trend.change
  const increasing = change !== null && change > 3
  const decreasing = change !== null && change < -3

  return (
    <div className="space-y-5">
      <section className="chart-panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {studentView ? 'Your support indicators' : 'Student support assessment'}
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{student.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {student.studentId} · {student.department || 'Department unavailable'}
              {student.year ? ` · Year ${student.year}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-slate-500">Overall support indicator</div>
              <div className="text-3xl font-bold text-slate-900">
                {assessment.riskScore == null ? '—' : `${Math.round(assessment.riskScore)}/100`}
              </div>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskTone(assessment.riskLevel)}`}>
                {studentView ? (assessment.riskLevel === 'Critical' || assessment.riskLevel === 'High' ? 'Support may help' : assessment.riskLevel === 'Unavailable' ? 'More data needed' : 'Steady indicators') : assessment.riskLevel}
              </span>
            </div>
            {!studentView && (
              <button type="button" onClick={() => onRecordAssessment(student.studentId)} disabled={saving || assessment.riskScore == null} className="secondary-btn gap-2">
                <RefreshCw size={15} className={saving ? 'animate-spin' : ''} />
                Record assessment
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm leading-6 text-indigo-950">
          {assessment.supportIndicator}
        </p>
        {assessment.riskScore == null && (
          <p className="mt-3 text-sm text-amber-700">
            There is not enough recorded information to calculate an overall score. Missing indicators are left unknown rather than treated as risk.
          </p>
        )}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Risk categories</h3>
            {Object.keys(categoryLabels).map((name) => (
              <CategoryBar key={name} name={name} score={assessment.categories[name]} />
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Why this score?</h3>
            {assessment.contributors.length ? assessment.contributors.slice(0, 5).map((factor) => (
              <div key={factor.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{categoryLabels[factor.name] || factor.name}</span>
                <span className="text-slate-500">{factor.weight}% of score · {factor.score}% signal</span>
              </div>
            )) : <p className="text-sm text-slate-500">No measured risk indicators are available yet.</p>}
            <p className="pt-1 text-xs text-slate-500">
              Weights are normalized across available categories only. Current data covers {assessment.dataCoverage.availableCategories} of {assessment.dataCoverage.totalCategories} categories.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="chart-panel space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="text-indigo-600" size={18} />
            <h3 className="font-semibold text-slate-900">Trend and early signals</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${increasing ? 'bg-rose-50 text-rose-700' : decreasing ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
              {increasing ? <ArrowUpRight size={15} /> : decreasing ? <ArrowDownRight size={15} /> : <Activity size={15} />}
              {trend.label}
            </span>
            <span className="text-sm text-slate-600">
              {change === null ? 'No earlier assessment recorded' : `${change > 0 ? '+' : ''}${change} points since the previous assessment`}
            </span>
          </div>
          {history.length ? (
            <div className="flex items-end gap-2 border-b border-slate-100 pb-3 pt-2">
              {history.map((item, index) => (
                <div key={`${item.assessedAt}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-700">{Math.round(item.riskScore)}</span>
                  <div className="w-full rounded-t-md bg-indigo-500" style={{ height: `${Math.max(8, item.riskScore)}px` }} />
                  <span className="max-w-full truncate text-[10px] text-slate-500">{formatDate(item.assessedAt)}</span>
                </div>
              ))}
              {assessment.riskScore != null && (
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-900">{Math.round(assessment.riskScore)}</span>
                  <div className="w-full rounded-t-md bg-slate-400" style={{ height: `${Math.max(8, assessment.riskScore)}px` }} />
                  <span className="text-[10px] text-slate-500">Current</span>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              This is a baseline assessment. Record assessments on different dates to identify when risk starts changing; no history is being inferred.
            </p>
          )}
          {assessment.trendStart && (
            <p className="text-sm text-slate-600">Increase first appeared after the assessment on {formatDate(assessment.trendStart)}.</p>
          )}
          {assessment.detectedPatterns.length > 0 ? assessment.detectedPatterns.map((pattern) => (
            <div key={pattern.title} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle size={16} />{pattern.title}</div>
              <p className="mt-1 text-sm leading-6 text-amber-950">{pattern.detail}</p>
              <p className="mt-1 text-sm text-amber-900">{pattern.interpretation}</p>
            </div>
          )) : <p className="text-sm text-slate-500">No multi-signal early warning pattern is present in the available indicators.</p>}
        </section>

        <section className="chart-panel space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={18} />
            <h3 className="font-semibold text-slate-900">Cautious outlook</h3>
          </div>
          {prediction.available ? (
            <>
              <p className="text-sm leading-6 text-slate-600">{prediction.explanation}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Possible in 2 weeks</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{prediction.nextTwoWeeks}/100</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Possible in 4 weeks</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{prediction.nextFourWeeks}/100</div>
                </div>
              </div>
              <p className="text-xs text-slate-500">Projection uses recent recorded risk changes and may not reflect future events. Main current contributors: {prediction.factors.map((name) => categoryLabels[name] || name).join(', ') || 'none available'}.</p>
            </>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{prediction.explanation}</p>
          )}
          <div>
            <h4 className="mb-2 font-semibold text-slate-900">Suggested supportive actions</h4>
            <ol className="space-y-2">
              {assessment.recommendations.map((item) => (
                <li key={item.priority} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{item.priority}</span>
                  <span className="text-slate-700">{item.action}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {!studentView && (
        <section className="chart-panel space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><HeartHandshake className="text-indigo-600" size={18} /><h3 className="font-semibold text-slate-900">Human-led intervention tracking</h3></div>
              <p className="mt-1 text-sm text-slate-500">Record the action, student response, follow-up, and outcome. Keep decisions with faculty and mentors.</p>
            </div>
            <button type="button" className="glass-btn gap-2" onClick={() => setShowInterventionForm((visible) => !visible)}>
              <ClipboardCheck size={16} /> {showInterventionForm ? 'Cancel' : 'Create support action'}
            </button>
          </div>
          {showInterventionForm && (
            <form onSubmit={saveNewIntervention} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
              <input aria-label="Recommended action" required maxLength={500} value={intervention.recommendation} onChange={(event) => setIntervention({ ...intervention, recommendation: event.target.value })} placeholder="Action to take" />
              <input aria-label="Assigned mentor or faculty" maxLength={120} value={intervention.assignedFaculty} onChange={(event) => setIntervention({ ...intervention, assignedFaculty: event.target.value })} placeholder="Responsible mentor / faculty" />
              <label className="space-y-1 text-xs font-medium text-slate-600">Follow-up date<input aria-label="Follow-up date" required type="date" value={intervention.followUpDate} onChange={(event) => setIntervention({ ...intervention, followUpDate: event.target.value })} /></label>
              <label className="space-y-1 text-xs font-medium text-slate-600">Notes for the support team<textarea aria-label="Intervention notes" maxLength={1000} value={intervention.notes} onChange={(event) => setIntervention({ ...intervention, notes: event.target.value })} rows={2} placeholder="Context, next step, or agreed support" /></label>
              <button type="submit" className="glass-btn gap-2 md:col-span-2"><CheckCircle2 size={16} />Save support action</button>
            </form>
          )}
          {assessment.interventions.length ? (
            <div className="space-y-3">
              {assessment.interventions.map((item) => (
                <div key={item.id || item._id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{item.recommendation || item.riskType}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Created: {formatDate(item.createdDate || item.createdAt)}</span>
                        <span>Owner: {item.assignedFaculty || 'Not assigned'}</span>
                        <span>Status: {item.status || 'Open'}</span>
                        <span>Follow-up: {formatDate(item.followUpDate || item.dueDate)}</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.effectiveness === 'Effective' ? 'bg-emerald-100 text-emerald-800' : item.effectiveness === 'Not Effective' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                      {item.effectiveness || 'Still Under Evaluation'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="Intervention workflow">
                    {[
                      ['Risk detected', true],
                      ['Faculty assigned', Boolean(item.assignedFaculty && item.assignedFaculty !== 'To be assigned')],
                      ['Action taken', Boolean(item.actionTaken)],
                      ['Student response', Boolean(item.studentResponse)],
                      ['Outcome measured', item.outcomeRiskScore != null]
                    ].map(([step, complete], index) => (
                      <span key={step} className="inline-flex items-center gap-1">
                        {index > 0 && <ArrowRight size={12} />}
                        <span className={`rounded-full px-2 py-1 ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{step}</span>
                      </span>
                    ))}
                  </div>
                  {item.riskBeforeIntervention != null && item.outcomeRiskScore != null && (
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Risk before: {Math.round(item.riskBeforeIntervention)}/100
                      <ArrowRight className="mx-2 inline" size={14} />
                      Follow-up: {Math.round(item.outcomeRiskScore)}/100
                      <span className="ml-2 text-slate-500">
                        ({item.outcomeRiskScore < item.riskBeforeIntervention ? 'down' : item.outcomeRiskScore > item.riskBeforeIntervention ? 'up' : 'unchanged'} {Math.abs(Math.round(item.outcomeRiskScore - item.riskBeforeIntervention))} points)
                      </span>
                    </p>
                  )}
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <select aria-label="Intervention status" value={outcomeEdits[item.id]?.status ?? item.status ?? 'Open'} onChange={(event) => updateOutcome(item, 'status', event.target.value)}>
                      <option>Open</option><option>In Progress</option><option>Completed</option><option>Escalated</option>
                    </select>
                    <input aria-label="Action taken" value={outcomeEdits[item.id]?.actionTaken ?? item.actionTaken ?? ''} onChange={(event) => updateOutcome(item, 'actionTaken', event.target.value)} placeholder="Action taken" />
                    <input aria-label="Student response" value={outcomeEdits[item.id]?.studentResponse ?? item.studentResponse ?? ''} onChange={(event) => updateOutcome(item, 'studentResponse', event.target.value)} placeholder="Student response" />
                    <input aria-label="Outcome risk score" type="number" min="0" max="100" value={outcomeEdits[item.id]?.outcomeRiskScore ?? item.outcomeRiskScore ?? ''} onChange={(event) => updateOutcome(item, 'outcomeRiskScore', event.target.value)} placeholder="Risk score at follow-up" />
                    <textarea aria-label="Intervention outcome" className="md:col-span-2" value={outcomeEdits[item.id]?.outcome ?? item.outcome ?? ''} onChange={(event) => updateOutcome(item, 'outcome', event.target.value)} rows={2} placeholder="Outcome notes and student feedback" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => saveOutcome(item)} className="secondary-btn gap-2"><CheckCircle2 size={15} />Save follow-up</button>
                    <button type="button" onClick={() => measureOutcome(item)} className="secondary-btn gap-2"><Activity size={15} />Measure current outcome</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No support actions are recorded for this student yet.</div>
          )}
          {assessment.interventions.some((item) => item.riskBeforeIntervention != null && item.outcomeRiskScore != null) && (
            <p className="text-sm text-slate-600">
              Measured intervention outcomes compare the recorded risk score before action with the assessment at follow-up. They are historical observations, not proof that an intervention caused the change.
            </p>
          )}
        </section>
      )}

      {studentView && assessment.interventions.length > 0 && (
        <section className="chart-panel">
          <div className="flex items-center gap-2"><ShieldCheck className="text-emerald-600" size={18} /><h3 className="font-semibold text-slate-900">Your support plan</h3></div>
          <div className="mt-3 space-y-3">
            {assessment.interventions.map((item) => (
              <div key={item.id || item._id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-800">{item.recommendation}</div>
                <div className="mt-1 text-slate-500">Status: {item.status} · Follow-up: {formatDate(item.followUpDate || item.dueDate)}</div>
                {item.studentResponse && <div className="mt-1 text-slate-600">Your response: {item.studentResponse}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function RiskPage() {
  const { auth } = useAuth()
  const studentView = auth?.user?.role === 'Student'
  const [assessments, setAssessments] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [riskResponse, interventionResponse] = await Promise.all([
        api.get('/risk-intelligence'),
        studentView ? Promise.resolve({ data: [] }) : api.get('/interventions')
      ])
      const interventionRecords = interventionResponse.data || []
      const rows = riskResponse.data.assessments.map((assessment) => ({
        ...assessment,
        interventions: interventionRecords.filter((item) =>
          String(item.studentId || item.student || '') === String(assessment.student.studentId)
        ).length
          ? interventionRecords.filter((item) =>
              String(item.studentId || item.student || '') === String(assessment.student.studentId)
            ).map((item) => ({
              ...item,
              id: item.id || item._id,
              student: item.studentId || item.student
            }))
          : assessment.interventions
      }))
      setAssessments(rows)
      setSummary(riskResponse.data.summary)
      setSelectedId((current) => rows.some((item) => item.student.studentId === current) ? current : rows[0]?.student.studentId || '')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Risk intelligence could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [studentView])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener('risk-interventions-updated', load)
    return () => window.removeEventListener('risk-interventions-updated', load)
  }, [load])

  const selected = useMemo(() =>
    assessments.find((item) => item.student.studentId === selectedId) || assessments[0] || null
  , [assessments, selectedId])

  const createIntervention = async (studentId, assessment, form) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/interventions', {
        student: studentId,
        riskType: assessment.contributors[0]?.name || 'General support',
        priority: assessment.riskLevel === 'Critical' || assessment.riskLevel === 'High' ? 'HIGH' : assessment.riskLevel === 'Moderate' ? 'MEDIUM' : 'LOW',
        recommendation: form.recommendation,
        assignedFaculty: form.assignedFaculty || 'To be assigned',
        followUpDate: form.followUpDate,
        dueDate: form.followUpDate,
        riskBeforeIntervention: assessment.riskScore,
        notes: form.notes || assessment.reasons.join(' ')
      })
      setNotice('Support action recorded. A faculty member should confirm ownership and the follow-up plan.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create the support action. Please try again.')
      throw requestError
    } finally {
      setSaving(false)
    }
  }

  const recordAssessment = async (studentId) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post(`/risk-intelligence/assessments/${encodeURIComponent(studentId)}`)
      setNotice('Assessment recorded. Future assessments can be compared with this baseline.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not record this assessment.')
    } finally {
      setSaving(false)
    }
  }

  const updateIntervention = async (id, updates) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.patch(`/interventions/${id}`, updates)
      setNotice('Intervention follow-up saved.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save the intervention follow-up.')
    } finally {
      setSaving(false)
    }
  }

  const measureInterventionOutcome = async (studentId, item) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await api.post(`/risk-intelligence/assessments/${encodeURIComponent(studentId)}`)
      await api.patch(`/interventions/${item.id}`, {
        outcomeRiskScore: result.data.assessment.riskScore,
        status: item.status,
        actionTaken: item.actionTaken || '',
        studentResponse: item.studentResponse || '',
        followUpDate: item.followUpDate || item.dueDate || '',
        outcome: item.outcome || ''
      })
      setNotice(`Follow-up risk score ${result.data.assessment.riskScore}/100 recorded for this intervention.`)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not measure the intervention outcome.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Loading risk intelligence...</div>

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-indigo-600">Risk Intelligence</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {studentView ? 'Your progress and support' : 'Student support overview'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Combine available academic, attendance, coursework, engagement, learning, and administrative signals to explain where human support may help.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <CircleHelp size={15} className="text-indigo-600" />
          Support indicator only — never a permanent label or diagnosis.
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {!studentView && summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Students assessed', value: summary.assessedStudents, icon: Users },
              { label: 'Support follow-up may help', value: summary.needingSupport, icon: HeartHandshake },
              { label: 'Average support indicator', value: summary.averageRisk == null ? '—' : `${summary.averageRisk}/100`, icon: Activity },
              { label: 'Recorded interventions', value: assessments.reduce((sum, item) => sum + item.interventions.length, 0), icon: ClipboardCheck }
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="chart-panel flex items-center gap-3">
                <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Icon size={19} /></span>
                <div><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-bold text-slate-900">{value}</div></div>
              </div>
            ))}
          </div>
          {auth?.user?.role === 'Admin' && summary.departments.length > 0 && (
            <section className="chart-panel">
              <div className="mb-4 flex items-center gap-2"><Users className="text-indigo-600" size={18} /><h2 className="font-semibold text-slate-900">Department view</h2></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {summary.departments.map((department) => (
                  <div key={department.department} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium text-slate-800">{department.department}</span><span className="text-sm font-semibold text-indigo-700">{department.averageRisk}/100 avg.</span></div>
                    <p className="mt-1 text-xs text-slate-500">{department.needingSupport} of {department.students} with score above 60</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="chart-panel">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="font-semibold text-slate-900">Students for review</h2><p className="mt-1 text-xs text-slate-500">Scores prioritize a human review; use the supporting factors, not the number alone.</p></div>
              <button type="button" className="secondary-btn gap-2" onClick={load}><RefreshCw size={15} />Refresh</button>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2 pr-4">Student</th><th className="py-2 pr-4">Department</th><th className="py-2 pr-4">Score</th><th className="py-2 pr-4">Level</th><th className="py-2 pr-4">Main contributor</th><th className="py-2 pr-4">Coverage</th><th className="py-2 pr-2">Review</th></tr>
                </thead>
                <tbody>
                  {assessments.map((item) => (
                    <tr key={item.student.studentId} className={`border-t border-slate-100 ${selectedId === item.student.studentId ? 'bg-indigo-50/70' : ''}`}>
                      <td className="py-2.5 pr-4"><div className="font-medium text-slate-800">{item.student.name}</div><div className="text-xs text-slate-500">{item.student.studentId}</div></td>
                      <td className="py-2.5 pr-4">{item.student.department || '—'}</td>
                      <td className="py-2.5 pr-4 font-semibold">{item.riskScore == null ? '—' : `${item.riskScore}/100`}</td>
                      <td className="py-2.5 pr-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskTone(item.riskLevel)}`}>{item.riskLevel}</span></td>
                      <td className="py-2.5 pr-4 text-slate-600">{categoryLabels[item.contributors[0]?.name] || 'No score data'}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{item.dataCoverage.availableCategories}/{item.dataCoverage.totalCategories}</td>
                      <td className="py-2.5 pr-2"><button type="button" onClick={() => setSelectedId(item.student.studentId)} className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900">View <ArrowRight size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assessments.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No student records are available for this view.</p>}
            </div>
          </section>
          {summary && (
            <section className="chart-panel">
              <h2 className="mb-3 font-semibold text-slate-900">Common risk factors (measured records only)</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(summary.categoryAverages).map(([name, score]) => (
                  <div key={name} className="rounded-xl bg-slate-50 p-3">
                    <CategoryBar name={name} score={score} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selected && (
        <RiskDetail
          key={selected.student.studentId}
          assessment={selected}
          studentView={studentView}
          onCreateIntervention={createIntervention}
          onRecordAssessment={recordAssessment}
          onUpdateIntervention={updateIntervention}
          onMeasureOutcome={measureInterventionOutcome}
          saving={saving}
        />
      )}

      {!selected && !error && (
        <div className="chart-panel flex items-center gap-3 text-sm text-slate-600">
          <CalendarClock className="text-slate-400" size={20} />
          No risk indicators are available. Add student profile data to begin a supported assessment.
        </div>
      )}
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 shrink-0 text-indigo-600" size={16} />
        Access is role-scoped. Missing signals are excluded from the score; any fee-related support recommendation should be discussed privately. Risk projections are conditional estimates, and people—not the model—make intervention decisions.
      </div>
    </div>
  )
}
