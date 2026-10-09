import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Plus, Save, TrendingUp } from 'lucide-react'
import api from '../services/api'

const emptyIntervention = () => ({
  student: '',
  riskType: 'Attendance',
  priority: 'MEDIUM',
  recommendation: '',
  assignedFaculty: '',
  status: 'Open',
  notes: '',
  riskBeforeIntervention: '',
  outcomeAssessment: 'Not Yet Reviewed'
})

const makeUpdate = (item) => ({
  status: item.status || 'Open',
  actionTaken: item.actionTaken || '',
  studentResponse: item.studentResponse || '',
  followUpDate: item.followUpDate ? new Date(item.followUpDate).toISOString().slice(0, 10) : '',
  riskBeforeIntervention: item.riskBeforeIntervention ?? '',
  outcomeRiskScore: item.outcomeRiskScore ?? '',
  outcomeAssessment: item.outcomeAssessment || 'Not Yet Reviewed',
  outcome: item.outcome || ''
})

export default function InterventionsPage() {
  const [interventions, setInterventions] = useState([])
  const [updates, setUpdates] = useState({})
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyIntervention())

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const load = async () => {
    const response = await api.get('/interventions')
    setInterventions(response.data)
    setUpdates(Object.fromEntries(response.data.map((item) => [item.id, makeUpdate(item)])))
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.response?.data?.message || 'Could not load interventions.'))
  }, [])

  const outcomeSummary = useMemo(() => {
    const completed = interventions.filter((item) => item.status === 'Completed')
    const reviewed = completed.filter((item) =>
      item.outcomeAssessment && item.outcomeAssessment !== 'Not Yet Reviewed' ||
      item.riskBeforeIntervention != null && item.outcomeRiskScore != null
    )
    const improved = reviewed.filter((item) =>
      item.outcomeAssessment === 'Improved' ||
      item.riskBeforeIntervention != null && item.outcomeRiskScore != null &&
        Number(item.outcomeRiskScore) < Number(item.riskBeforeIntervention)
    )
    return { completed: completed.length, reviewed: reviewed.length, improved: improved.length }
  }, [interventions])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (creating) return
    setCreating(true)
    setError('')
    try {
      await api.post('/interventions', {
        ...form,
        riskBeforeIntervention: form.riskBeforeIntervention === '' ? null : Number(form.riskBeforeIntervention)
      })
      setToast('Intervention created. Record completion and follow-up outcome here.')
      setForm(emptyIntervention())
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create the intervention.')
    } finally {
      setCreating(false)
    }
  }

  const updateField = (id, field, value) => {
    setUpdates((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  const saveUpdate = async (item) => {
    if (savingId) return
    setSavingId(item.id)
    setError('')
    const update = updates[item.id]
    const payload = {
      ...update,
      riskBeforeIntervention: update.riskBeforeIntervention === '' ? null : Number(update.riskBeforeIntervention),
      outcomeRiskScore: update.outcomeRiskScore === '' ? null : Number(update.outcomeRiskScore)
    }
    try {
      const response = await api.patch(`/interventions/${encodeURIComponent(item.id)}`, payload)
      setInterventions((current) => current.map((record) => record.id === item.id ? response.data : record))
      setUpdates((current) => ({ ...current, [item.id]: makeUpdate(response.data) }))
      setToast('Completion and outcome feedback saved. Future recommendations can use this observed result.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save intervention feedback.')
    } finally {
      setSavingId('')
    }
  }

  const focusForm = () => {
    document.getElementById('intervention-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('intervention-student')?.focus()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-indigo-600">Intervention Management</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Student Support Workflow</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Record whether support was completed and what changed at follow-up. Recorded outcomes help tailor future suggestions; they do not prove an intervention caused the change.</p>
        </div>
        <button type="button" onClick={focusForm} className="glass-btn gap-2"><Plus size={16} /> Create Intervention</button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {toast && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{toast}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Completed interventions', value: outcomeSummary.completed, icon: CheckCircle2 },
          { label: 'With outcome recorded', value: outcomeSummary.reviewed, icon: ClipboardCheck },
          { label: 'Improvement observed', value: outcomeSummary.improved, icon: TrendingUp }
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm text-slate-500">{label}<Icon size={17} className="text-indigo-600" /></div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
        <form id="intervention-form" onSubmit={handleSubmit} className="chart-panel space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Create intervention</h2>
          <label className="block text-sm font-medium text-slate-700">Student ID
            <input id="intervention-student" required value={form.student} onChange={(event) => setForm({ ...form, student: event.target.value.toUpperCase() })} placeholder="e.g. STU1000" className="mt-1" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Support area
            <input required value={form.riskType} onChange={(event) => setForm({ ...form, riskType: event.target.value })} placeholder="Attendance, academic, assignments…" className="mt-1" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Priority
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-1">
              <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Agreed recommendation
            <input required value={form.recommendation} onChange={(event) => setForm({ ...form, recommendation: event.target.value })} placeholder="Agreed support action" className="mt-1" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Assigned faculty
            <input value={form.assignedFaculty} onChange={(event) => setForm({ ...form, assignedFaculty: event.target.value })} placeholder="Faculty or mentor" className="mt-1" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Starting risk indicator (optional, 0–100)
            <input type="number" min="0" max="100" value={form.riskBeforeIntervention} onChange={(event) => setForm({ ...form, riskBeforeIntervention: event.target.value })} className="mt-1" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Notes
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} placeholder="Agreed follow-up" className="mt-1" />
          </label>
          <button type="submit" disabled={creating} className="glass-btn w-full disabled:opacity-50">{creating ? 'Saving…' : 'Save Intervention'}</button>
        </form>

        <section aria-label="Intervention completion and outcome tracker" className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Completion & outcome feedback</h2>
          {interventions.length === 0 && <div className="chart-panel text-sm text-slate-500">No interventions have been recorded yet.</div>}
          {interventions.map((item) => {
            const update = updates[item.id] || makeUpdate(item)
            return (
              <article key={item.id} className="chart-panel space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.recommendation || item.riskType}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.student} · {item.riskType} · {item.assignedFaculty || 'Unassigned'}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : item.status === 'Escalated' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{item.status || 'Open'}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">Completion status
                    <select value={update.status} onChange={(event) => updateField(item.id, 'status', event.target.value)} className="mt-1">
                      <option>Open</option><option>In Progress</option><option>Completed</option><option>Escalated</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">Follow-up date
                    <input type="date" value={update.followUpDate} onChange={(event) => updateField(item.id, 'followUpDate', event.target.value)} className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">Action completed
                    <input value={update.actionTaken} onChange={(event) => updateField(item.id, 'actionTaken', event.target.value)} placeholder="What was done?" className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">Student response
                    <input value={update.studentResponse} onChange={(event) => updateField(item.id, 'studentResponse', event.target.value)} placeholder="Student's response or participation" className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">Before indicator (0–100)
                    <input type="number" min="0" max="100" value={update.riskBeforeIntervention} onChange={(event) => updateField(item.id, 'riskBeforeIntervention', event.target.value)} className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">Follow-up indicator (0–100)
                    <input type="number" min="0" max="100" value={update.outcomeRiskScore} onChange={(event) => updateField(item.id, 'outcomeRiskScore', event.target.value)} className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">Student outcome
                    <select value={update.outcomeAssessment} onChange={(event) => updateField(item.id, 'outcomeAssessment', event.target.value)} className="mt-1">
                      <option>Not Yet Reviewed</option><option>Improved</option><option>No Change</option><option>Needs More Support</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">Outcome notes
                    <textarea value={update.outcome} onChange={(event) => updateField(item.id, 'outcome', event.target.value)} rows={2} placeholder="What changed? What should be tried next?" className="mt-1" />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">Recommendations use completed interventions with reviewed outcomes. Follow-up changes are observational.</span>
                  <button type="button" disabled={Boolean(savingId)} onClick={() => saveUpdate(item)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    <Save size={15} /> {savingId === item.id ? 'Saving…' : 'Save follow-up'}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </div>
  )
}
