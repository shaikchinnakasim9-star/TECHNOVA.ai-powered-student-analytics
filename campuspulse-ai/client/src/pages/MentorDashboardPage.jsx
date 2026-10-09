import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ClipboardList, UserRound } from 'lucide-react'
import api from '../services/api'

const recordTypes = ['Feedback', 'Note', 'Task', 'Goal', 'Session', 'Message']

export default function MentorDashboardPage() {
  const [students, setStudents] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ type: 'Feedback', title: '', message: '', dueDate: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStudents = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/management/mentoring/students')
      setStudents(response.data || [])
      setSelectedId((current) => response.data.some((student) => student.studentId === current)
        ? current
        : response.data[0]?.studentId || '')
    } catch (requestError) {
      setStudents([])
      setError(requestError.response?.data?.message || 'Assigned students could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async (studentId) => {
    if (!studentId) {
      setRecords([])
      return
    }
    try {
      const response = await api.get(`/management/mentoring/students/${encodeURIComponent(studentId)}/records`)
      setRecords(response.data || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Mentoring history could not be loaded.')
    }
  }

  useEffect(() => { loadStudents() }, [])
  useEffect(() => { loadRecords(selectedId) }, [selectedId])

  const createRecord = async (event) => {
    event.preventDefault()
    if (!selectedId || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post(`/management/mentoring/students/${encodeURIComponent(selectedId)}/records`, form)
      setForm({ type: 'Feedback', title: '', message: '', dueDate: '' })
      setNotice(`${form.type} shared with the student.`)
      await loadRecords(selectedId)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your mentoring update could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const selectedStudent = students.find((student) => student.studentId === selectedId)

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white shadow-soft">
        <div className="flex items-center gap-3 text-indigo-100"><UserRound size={20} /> Mentor workspace</div>
        <h1 className="mt-2 text-3xl font-bold">My assigned students</h1>
        <p className="mt-2 text-indigo-100">Student records are limited to the students assigned to your mentor account.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loading ? (
        <div className="chart-panel py-10 text-center text-slate-500">Loading your assigned students…</div>
      ) : students.length === 0 ? (
        <div className="chart-panel py-10 text-center text-slate-600">No active students are assigned to you yet. Ask an administrator to assign students to your account.</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <section className="space-y-3">
            {students.map((student) => (
              <article
                key={student.studentId}
                className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === student.studentId ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{student.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{student.studentId} · {student.department} · Year {student.year}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${student.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700' : student.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{student.riskLevel}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <span><BookOpen size={13} className="mr-1 inline" />CGPA {student.cgpa ?? '—'}</span>
                  <span><CalendarDays size={13} className="mr-1 inline" />{student.attendance ?? '—'}% attendance</span>
                  <span><AlertTriangle size={13} className="mr-1 inline" />Score {student.successScore ?? '—'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setSelectedId(student.studentId)} className="text-xs font-semibold text-indigo-700 underline">Manage support</button>
                  <Link to={`/students/${encodeURIComponent(student.studentId)}`} className="text-xs font-semibold text-indigo-700 underline">View assigned student profile</Link>
                </div>
              </article>
            ))}
          </section>

          {selectedStudent && (
            <section className="space-y-4">
              <form onSubmit={createRecord} className="chart-panel space-y-3">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ClipboardList size={19} /> Add student support</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select aria-label="Mentoring record type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                    {recordTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  {['Task', 'Goal', 'Session'].includes(form.type) && <input aria-label={form.type === 'Session' ? 'Session date' : `${form.type} due date`} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />}
                </div>
                <input aria-label="Record title" required maxLength={120} placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                <textarea aria-label="Record message" required maxLength={3000} rows={3} placeholder="Write supportive, actionable guidance…" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
                <button type="submit" disabled={saving} className="glass-btn disabled:opacity-50">{saving ? 'Saving…' : `Share ${form.type.toLowerCase()}`}</button>
              </form>
              <div className="chart-panel space-y-3">
                <h2 className="font-semibold text-slate-900">Mentoring history · {selectedStudent.name}</h2>
                {records.length === 0 ? <p className="text-sm text-slate-500">No notes, tasks, feedback, or sessions recorded yet.</p> : records.map((record) => (
                  <article key={record._id || record.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-800">{record.title}</div>
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{record.type}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{record.message}</p>
                    {record.dueDate && <div className="mt-2 text-xs text-slate-500">{record.type === 'Session' ? 'Scheduled' : 'Due'} {new Date(record.dueDate).toLocaleDateString()}</div>}
                    {['Task', 'Goal'].includes(record.type) && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {record.status === 'Completed' ? <span className="text-emerald-700"><CheckCircle2 size={14} className="mr-1 inline" />Completed</span> : <span className="text-amber-700">{record.status}</span>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
