import { useEffect, useState } from 'react'
import { Mail, MessageCircle, Phone, Send, UserRound } from 'lucide-react'
import api from '../services/api'

export default function MyMentorPage() {
  const [data, setData] = useState({ mentor: null, records: [] })
  const [form, setForm] = useState({ title: '', message: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/management/my-mentor')
      setData(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your mentor information could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!data.mentor || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post(`/management/mentoring/students/${encodeURIComponent(data.studentId)}/records`, {
        type: 'Message',
        title: form.title,
        message: form.message
      })
      setForm({ title: '', message: '' })
      setNotice('Your message was sent to your mentor.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your message could not be sent.')
    } finally {
      setSaving(false)
    }
  }

  const updateTaskStatus = async (record, status) => {
    setError('')
    try {
      await api.patch(`/management/mentoring/records/${encodeURIComponent(record._id || record.id)}`, { status })
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Task progress could not be updated.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-indigo-600">Student support</div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">My mentor</h1>
        <p className="mt-2 text-slate-600">Your mentor and support history are visible only to you and your assigned mentor.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loading ? <div className="chart-panel p-8 text-center text-slate-500">Loading your mentor details…</div> : (
        <>
          <section className="chart-panel">
            {data.mentor ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-indigo-100 p-4 text-indigo-700"><UserRound size={28} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{data.mentor.name}</h2>
                    <div className="text-sm text-slate-500">{data.mentor.department || 'Mentor'}</div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={`mailto:${data.mentor.email}`} className="secondary-btn gap-2"><Mail size={16} />{data.mentor.email}</a>
                  {data.mentor.phone && <a href={`tel:${data.mentor.phone}`} className="secondary-btn gap-2"><Phone size={16} />{data.mentor.phone}</a>}
                </div>
              </>
            ) : (
              <div className="py-5 text-center">
                <UserRound size={32} className="mx-auto text-slate-400" />
                <h2 className="mt-3 font-semibold text-slate-900">No mentor assigned yet</h2>
                <p className="mt-1 text-sm text-slate-500">An administrator can assign a mentor to your account.</p>
              </div>
            )}
          </section>

          {data.mentor && (
            <form onSubmit={sendMessage} className="chart-panel space-y-3">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900"><MessageCircle size={18} className="text-indigo-600" /> Ask your mentor for support</h2>
              <input aria-label="Message subject" required maxLength={120} placeholder="Subject" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <textarea aria-label="Message" required maxLength={3000} rows={3} placeholder="Share what you need help with…" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
              <button type="submit" disabled={saving} className="glass-btn gap-2 disabled:opacity-50">{saving ? 'Sending…' : 'Send message'}<Send size={15} /></button>
            </form>
          )}

          <section className="chart-panel space-y-3">
            <h2 className="font-semibold text-slate-900">Feedback, tasks and mentoring history</h2>
            {data.records.length === 0 ? <p className="text-sm text-slate-500">Your mentor has not shared any feedback or tasks yet.</p> : data.records.map((record) => (
              <article key={record._id || record.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">{record.title}</h3>
                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{record.type}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{record.message}</p>
                {record.dueDate && <div className="mt-2 text-xs text-slate-500">Due {new Date(record.dueDate).toLocaleDateString()}</div>}
                {['Task', 'Goal'].includes(record.type) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-amber-700">{record.status}</span>
                    {record.status !== 'Completed' && <button type="button" onClick={() => updateTaskStatus(record, record.status === 'In Progress' ? 'Completed' : 'In Progress')} className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700">{record.status === 'In Progress' ? 'Mark completed' : 'Start task'}</button>}
                  </div>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
