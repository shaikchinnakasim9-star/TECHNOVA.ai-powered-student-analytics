import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Megaphone, Pencil, Plus, Users, UserRound, Bot } from 'lucide-react'
import api from '../services/api'

const tabs = [
  ['students', 'Students', Users],
  ['mentors', 'Mentors', UserRound],
  ['events', 'Events', CalendarDays],
  ['announcements', 'Announcements', Megaphone],
  ['settings', 'Settings', Bot]
]

const blankStudent = { name: '', studentId: '', department: '', year: '1', email: '', mentorId: '', status: 'Active' }
const defaultMentorPermissions = {
  canAddNotes: true,
  canGiveFeedback: true,
  canCreateTasks: true,
  canMessageStudents: true,
  canScheduleSessions: true,
  canManageGoals: true
}
const mentorPermissionLabels = {
  canAddNotes: 'Add mentor notes',
  canGiveFeedback: 'Give student feedback',
  canCreateTasks: 'Create student tasks',
  canMessageStudents: 'Message assigned students',
  canScheduleSessions: 'Schedule mentoring sessions',
  canManageGoals: 'Create and manage student goals'
}
const blankMentor = { name: '', email: '', department: '', phone: '', password: '', mentorPermissions: defaultMentorPermissions }
const blankEvent = { title: '', description: '', date: '', time: '', location: '', imageUrl: '', department: 'All', year: 'All', registrationDeadline: '', published: true }
const blankAnnouncement = { title: '', message: '', priority: 'Information', audienceType: 'All Students', audienceValue: '' }

export default function AdminManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'students')
  const [students, setStudents] = useState([])
  const [mentors, setMentors] = useState([])
  const [events, setEvents] = useState([])
  const [eventRegistrants, setEventRegistrants] = useState({})
  const [loadingRegistrations, setLoadingRegistrations] = useState('')
  const [announcements, setAnnouncements] = useState([])
  const [audienceOptions, setAudienceOptions] = useState({ departments: [], mentors: [] })
  const [studentForm, setStudentForm] = useState(blankStudent)
  const [mentorForm, setMentorForm] = useState(blankMentor)
  const [eventForm, setEventForm] = useState(blankEvent)
  const [announcementForm, setAnnouncementForm] = useState(blankAnnouncement)
  const [settings, setSettings] = useState({ chatbotEnabled: true, assistantWelcome: '' })
  const [editingStudent, setEditingStudent] = useState('')
  const [editingMentor, setEditingMentor] = useState('')
  const [editingEvent, setEditingEvent] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [studentResponse, mentorResponse, eventResponse, announcementResponse, optionsResponse, settingsResponse] = await Promise.all([
        api.get('/management/students'),
        api.get('/management/mentors'),
        api.get('/management/events'),
        api.get('/management/announcements'),
        api.get('/management/audience-options'),
        api.get('/management/settings')
      ])
      setStudents(studentResponse.data || [])
      setMentors(mentorResponse.data || [])
      setEvents(eventResponse.data || [])
      setAnnouncements(announcementResponse.data || [])
      setAudienceOptions(optionsResponse.data || { departments: [], mentors: [] })
      setSettings({ chatbotEnabled: settingsResponse.data.chatbotEnabled !== false, assistantWelcome: settingsResponse.data.assistantWelcome || '' })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Management data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const nextTab = searchParams.get('tab')
    if (tabs.some(([key]) => key === nextTab)) setTab(nextTab)
  }, [searchParams])

  const resetNotice = () => { setNotice(''); setError(''); setTemporaryPassword('') }

  const saveStudent = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    resetNotice()
    try {
      const payload = { ...studentForm, year: Number(studentForm.year) }
      const response = editingStudent
        ? await api.patch(`/management/students/${encodeURIComponent(editingStudent)}`, payload)
        : await api.post('/management/students', payload)
      if (!editingStudent && response.data.temporaryPassword) setTemporaryPassword(`Student login password (share securely): ${response.data.temporaryPassword}`)
      setNotice(editingStudent ? 'Student details updated.' : 'Student account created.')
      setStudentForm(blankStudent)
      setEditingStudent('')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Student details could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const editStudent = (student) => {
    setStudentForm({
      name: student.name || '',
      studentId: student.studentId || '',
      department: student.department || '',
      year: String(student.year || 1),
      email: student.email || '',
      mentorId: student.mentorId || '',
      status: student.status || 'Active'
    })
    setEditingStudent(student.studentId)
    setTab('students')
  }

  const saveMentor = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    resetNotice()
    try {
      const response = editingMentor
        ? await api.patch(`/management/mentors/${encodeURIComponent(editingMentor)}`, mentorForm)
        : await api.post('/management/mentors', mentorForm)
      if (!editingMentor && response.data.temporaryPassword) setTemporaryPassword(`Mentor login password (share securely): ${response.data.temporaryPassword}`)
      setNotice(editingMentor ? 'Mentor details updated.' : 'Mentor account created.')
      setMentorForm(blankMentor)
      setEditingMentor('')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Mentor details could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const saveEvent = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    resetNotice()
    try {
      if (editingEvent) await api.put(`/management/events/${encodeURIComponent(editingEvent)}`, eventForm)
      else await api.post('/management/events', eventForm)
      setNotice(editingEvent ? 'Event updated.' : 'Event created.')
      setEventForm(blankEvent)
      setEditingEvent('')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Event could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const saveAnnouncement = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    resetNotice()
    try {
      await api.post('/management/announcements', {
        title: announcementForm.title,
        message: announcementForm.message,
        priority: announcementForm.priority,
        audience: { type: announcementForm.audienceType, value: announcementForm.audienceValue }
      })
      setNotice('Announcement published and student notifications created.')
      setAnnouncementForm(blankAnnouncement)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Announcement could not be published.')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    resetNotice()
    try {
      const response = await api.patch('/management/settings', settings)
      setSettings({ chatbotEnabled: response.data.chatbotEnabled, assistantWelcome: response.data.assistantWelcome })
      setNotice('Platform settings saved.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Platform settings could not be saved.')
    }
  }

  const deactivateStudent = async (student) => {
    if (!window.confirm(`Deactivate the account for ${student.name}?`)) return
    resetNotice()
    try {
      await api.delete(`/management/students/${encodeURIComponent(student.studentId)}`)
      setNotice(`${student.name}'s account was deactivated.`)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Student account could not be deactivated.')
    }
  }

  const deactivateMentor = async (mentor) => {
    resetNotice()
    try {
      await api.delete(`/management/mentors/${encodeURIComponent(mentor.id)}`)
      setNotice(`${mentor.name}'s account was deactivated.`)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Reassign the mentor’s students before deactivation.')
    }
  }

  const editEvent = (event) => {
    setEditingEvent(event._id || event.id)
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date ? new Date(event.date).toISOString().slice(0, 10) : '',
      time: event.time || '',
      location: event.location || '',
      imageUrl: event.imageUrl || '',
      department: event.department || 'All',
      year: String(event.year || 'All'),
      registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 10) : '',
      published: Boolean(event.published)
    })
  }

  const removeEvent = async (event) => {
    resetNotice()
    try {
      await api.delete(`/management/events/${encodeURIComponent(event._id || event.id)}`)
      setNotice('Event deleted.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Event could not be deleted.')
    }
  }

  const togglePublish = async (event) => {
    resetNotice()
    try {
      await api.put(`/management/events/${encodeURIComponent(event._id || event.id)}`, { ...event, published: !event.published })
      setNotice(event.published ? 'Event unpublished.' : 'Event published to matching student dashboards.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Event publication status could not be changed.')
    }
  }

  const loadEventRegistrations = async (event) => {
    const eventId = event._id || event.id
    setLoadingRegistrations(eventId)
    resetNotice()
    try {
      const response = await api.get(`/management/events/${encodeURIComponent(eventId)}/registrations`)
      setEventRegistrants((current) => ({ ...current, [eventId]: response.data || [] }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Event registrations could not be loaded.')
    } finally {
      setLoadingRegistrations('')
    }
  }

  const cancelStudentEdit = () => {
    setEditingStudent('')
    setStudentForm(blankStudent)
  }
  const cancelMentorEdit = () => {
    setEditingMentor('')
    setMentorForm(blankMentor)
  }
  const cancelEventEdit = () => {
    setEditingEvent('')
    setEventForm(blankEvent)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-800 p-6 text-white shadow-soft">
        <div className="text-sm uppercase tracking-[0.2em] text-indigo-200">Administration</div>
        <h1 className="mt-2 text-3xl font-bold">Student success management</h1>
        <p className="mt-2 text-indigo-100">Manage student accounts, mentor assignments, events and student announcements.</p>
      </div>
      {(error || notice || temporaryPassword) && (
        <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {error || notice || temporaryPassword}
          {temporaryPassword && <div className="mt-1 font-semibold">{temporaryPassword}</div>}
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Administration sections">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { resetNotice(); setTab(key); setSearchParams({ tab: key }) }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      {loading ? <div className="chart-panel p-10 text-center text-slate-500">Loading administration data…</div> : (
        <>
          {tab === 'students' && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
              <form onSubmit={saveStudent} className="chart-panel space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Plus size={18} />{editingStudent ? `Edit ${editingStudent}` : 'Add student'}</h2>
                <input required maxLength={120} placeholder="Student name" value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required maxLength={32} disabled={Boolean(editingStudent)} placeholder="Student ID" value={studentForm.studentId} onChange={(event) => setStudentForm({ ...studentForm, studentId: event.target.value.toUpperCase() })} />
                  <input required type="email" placeholder="Email" value={studentForm.email} onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required placeholder="Department" value={studentForm.department} onChange={(event) => setStudentForm({ ...studentForm, department: event.target.value })} />
                  <select aria-label="Student year" value={studentForm.year} onChange={(event) => setStudentForm({ ...studentForm, year: event.target.value })}>{[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select>
                </div>
                <label className="block text-sm font-medium text-slate-700">Assign mentor</label>
                <select aria-label="Assign mentor" value={studentForm.mentorId} onChange={(event) => setStudentForm({ ...studentForm, mentorId: event.target.value })}>
                  <option value="">No mentor yet</option>
                  {mentors.filter((mentor) => mentor.status !== 'Inactive').map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name} · {mentor.department || mentor.email}</option>)}
                </select>
                {editingStudent && <select aria-label="Student account status" value={studentForm.status} onChange={(event) => setStudentForm({ ...studentForm, status: event.target.value })}><option>Active</option><option>Inactive</option></select>}
                <div className="flex flex-wrap gap-2">
                  <button disabled={saving} className="glass-btn disabled:opacity-50">{saving ? 'Saving…' : editingStudent ? 'Save student' : 'Create student'}</button>
                  {editingStudent && <button type="button" onClick={cancelStudentEdit} className="secondary-btn">Cancel</button>}
                </div>
                {!editingStudent && <p className="text-xs text-slate-500">A secure temporary password is generated and shown once after account creation.</p>}
              </form>
              <div className="chart-panel overflow-x-auto">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Students · {students.length}</h2>
                <table className="min-w-full text-left text-sm">
                  <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2 pr-3">Student</th><th className="py-2 pr-3">Department</th><th className="py-2 pr-3">Mentor</th><th className="py-2 pr-3">Status</th><th className="py-2">Actions</th></tr></thead>
                  <tbody>{students.map((student) => {
                    const mentor = mentors.find((item) => item.id === student.mentorId)
                    return <tr key={student.studentId} className="border-b border-slate-100">
                      <td className="py-3 pr-3"><div className="font-semibold">{student.name}</div><div className="text-xs text-slate-500">{student.studentId} · Year {student.year}</div></td>
                      <td className="py-3 pr-3">{student.department || '—'}</td>
                      <td className="py-3 pr-3">{mentor?.name || student.assignedFaculty || 'Unassigned'}</td>
                      <td className="py-3 pr-3">{student.status || 'Active'}</td>
                      <td className="py-3"><div className="flex gap-2"><button type="button" onClick={() => editStudent(student)} className="rounded-lg border p-2 text-indigo-700" aria-label={`Edit ${student.name}`}><Pencil size={14} /></button><button type="button" onClick={() => deactivateStudent(student)} disabled={student.status === 'Inactive'} className="rounded-lg border p-2 text-rose-700 disabled:opacity-40">Deactivate</button></div></td>
                    </tr>
                  })}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'mentors' && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
              <form onSubmit={saveMentor} className="chart-panel space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Plus size={18} />{editingMentor ? 'Edit mentor' : 'Add mentor'}</h2>
                <input required placeholder="Mentor name" value={mentorForm.name} onChange={(event) => setMentorForm({ ...mentorForm, name: event.target.value })} />
                <input required type="email" placeholder="Email" value={mentorForm.email} onChange={(event) => setMentorForm({ ...mentorForm, email: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input placeholder="Department" value={mentorForm.department} onChange={(event) => setMentorForm({ ...mentorForm, department: event.target.value })} />
                  <input placeholder="Contact phone" value={mentorForm.phone} onChange={(event) => setMentorForm({ ...mentorForm, phone: event.target.value })} />
                </div>
                <input type="password" minLength={8} autoComplete="new-password" placeholder={editingMentor ? 'New password (optional)' : 'Password (optional; generated if blank)'} value={mentorForm.password} onChange={(event) => setMentorForm({ ...mentorForm, password: event.target.value })} />
                <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <legend className="px-1 text-sm font-semibold text-slate-700">Mentor permissions</legend>
                  {Object.entries(mentorPermissionLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" className="h-4 w-4" checked={mentorForm.mentorPermissions?.[key] !== false} onChange={(event) => setMentorForm({
                        ...mentorForm,
                        mentorPermissions: { ...defaultMentorPermissions, ...mentorForm.mentorPermissions, [key]: event.target.checked }
                      })} />
                      {label}
                    </label>
                  ))}
                </fieldset>
                {editingMentor && <select aria-label="Mentor status" value={mentorForm.status || 'Active'} onChange={(event) => setMentorForm({ ...mentorForm, status: event.target.value })}><option>Active</option><option>Inactive</option></select>}
                <div className="flex flex-wrap gap-2"><button disabled={saving} className="glass-btn disabled:opacity-50">{saving ? 'Saving…' : editingMentor ? 'Save mentor' : 'Create mentor'}</button>{editingMentor && <button type="button" onClick={cancelMentorEdit} className="secondary-btn">Cancel</button>}</div>
              </form>
              <div className="chart-panel overflow-x-auto">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Mentors · {mentors.length}</h2>
                <table className="min-w-full text-left text-sm">
                  <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2 pr-3">Mentor</th><th className="py-2 pr-3">Department</th><th className="py-2 pr-3">Assigned students</th><th className="py-2 pr-3">Status</th><th className="py-2">Actions</th></tr></thead>
                  <tbody>{mentors.map((mentor) => <tr key={mentor.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3"><div className="font-semibold">{mentor.name}</div><div className="text-xs text-slate-500">{mentor.email}{mentor.phone ? ` · ${mentor.phone}` : ''}</div></td>
                    <td className="py-3 pr-3">{mentor.department || '—'}</td><td className="py-3 pr-3">{mentor.assignedStudentCount || 0}</td><td className="py-3 pr-3">{mentor.status || 'Active'}</td>
                    <td className="py-3"><div className="flex gap-2"><button type="button" onClick={() => { setEditingMentor(mentor.id); setMentorForm({ name: mentor.name, email: mentor.email, department: mentor.department || '', phone: mentor.phone || '', password: '', status: mentor.status || 'Active', mentorPermissions: { ...defaultMentorPermissions, ...mentor.mentorPermissions } }) }} className="rounded-lg border p-2 text-indigo-700" aria-label={`Edit ${mentor.name}`}><Pencil size={14} /></button><button type="button" onClick={() => deactivateMentor(mentor)} disabled={mentor.status === 'Inactive'} className="rounded-lg border p-2 text-rose-700 disabled:opacity-40">Deactivate</button></div></td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'events' && (
            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
              <form onSubmit={saveEvent} className="chart-panel space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Plus size={18} />{editingEvent ? 'Edit event' : 'Create event'}</h2>
                <input required maxLength={120} placeholder="Event title" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} />
                <textarea required rows={3} maxLength={3000} placeholder="Description" value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2"><input required type="date" aria-label="Event date" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} /><input required placeholder="Time" value={eventForm.time} onChange={(event) => setEventForm({ ...eventForm, time: event.target.value })} /></div>
                <input required placeholder="Location or online link" value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} />
                <input type="url" placeholder="Event image URL (optional)" value={eventForm.imageUrl} onChange={(event) => setEventForm({ ...eventForm, imageUrl: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <select aria-label="Event department" value={eventForm.department} onChange={(event) => setEventForm({ ...eventForm, department: event.target.value })}><option>All</option>{audienceOptions.departments.map((department) => <option key={department}>{department}</option>)}</select>
                  <select aria-label="Event year" value={eventForm.year} onChange={(event) => setEventForm({ ...eventForm, year: event.target.value })}><option>All</option>{[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select>
                  <input type="date" aria-label="Registration deadline" value={eventForm.registrationDeadline} onChange={(event) => setEventForm({ ...eventForm, registrationDeadline: event.target.value })} />
                </div>
                {editingEvent && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={eventForm.published} onChange={(event) => setEventForm({ ...eventForm, published: event.target.checked })} />Published</label>}
                <div className="flex flex-wrap gap-2"><button disabled={saving} className="glass-btn disabled:opacity-50">{saving ? 'Saving…' : editingEvent ? 'Save event' : 'Publish event'}</button>{editingEvent && <button type="button" onClick={cancelEventEdit} className="secondary-btn">Cancel</button>}</div>
              </form>
              <section className="space-y-3">
                <h2 className="font-semibold text-slate-900">Events and publication status</h2>
                {events.length === 0 && <div className="chart-panel text-sm text-slate-500">No events created yet.</div>}
                {events.map((event) => <article key={event._id || event.id} className="chart-panel">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900">{event.title}</h3><p className="text-sm text-slate-600">{new Date(event.date).toLocaleDateString()} · {event.time} · {event.location}</p><p className="mt-1 text-xs text-slate-500">{event.department || 'All departments'} · {event.year === 'All' ? 'All years' : `Year ${event.year}`}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${event.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{event.published ? 'Published' : 'Draft'}</span></div>
                  <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => editEvent(event)} className="secondary-btn gap-1"><Pencil size={14} />Edit</button><button type="button" onClick={() => togglePublish(event)} className="secondary-btn">{event.published ? 'Unpublish' : 'Publish'}</button><button type="button" onClick={() => loadEventRegistrations(event)} disabled={loadingRegistrations === (event._id || event.id)} className="secondary-btn">{loadingRegistrations === (event._id || event.id) ? 'Loading…' : 'View registrations'}</button><button type="button" onClick={() => removeEvent(event)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700">Delete</button></div>
                  {eventRegistrants[event._id || event.id] && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <h4 className="text-sm font-semibold text-slate-800">Registered students · {eventRegistrants[event._id || event.id].length}</h4>
                      {eventRegistrants[event._id || event.id].length ? (
                        <ul className="mt-2 space-y-1 text-sm text-slate-600">
                          {eventRegistrants[event._id || event.id].map((registration) => (
                            <li key={registration.studentId}>{registration.student?.name || registration.studentId} · {registration.studentId}{registration.student?.email ? ` · ${registration.student.email}` : ''}</li>
                          ))}
                        </ul>
                      ) : <p className="mt-1 text-sm text-slate-500">No active registrations yet.</p>}
                    </div>
                  )}
                </article>)}
              </section>
            </div>
          )}

          {tab === 'announcements' && (
            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
              <form onSubmit={saveAnnouncement} className="chart-panel space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Megaphone size={18} />Post announcement</h2>
                <input required maxLength={120} placeholder="Title" value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} />
                <textarea required rows={4} maxLength={3000} placeholder="Announcement message" value={announcementForm.message} onChange={(event) => setAnnouncementForm({ ...announcementForm, message: event.target.value })} />
                <select aria-label="Announcement priority" value={announcementForm.priority} onChange={(event) => setAnnouncementForm({ ...announcementForm, priority: event.target.value })}><option>Information</option><option>Attention</option><option>Urgent Support</option></select>
                <select aria-label="Announcement audience" value={announcementForm.audienceType} onChange={(event) => setAnnouncementForm({ ...announcementForm, audienceType: event.target.value, audienceValue: '' })}><option>All Students</option><option>Department</option><option>Year</option><option>Mentor Group</option></select>
                {announcementForm.audienceType === 'Department' && <select aria-label="Target department" required value={announcementForm.audienceValue} onChange={(event) => setAnnouncementForm({ ...announcementForm, audienceValue: event.target.value })}><option value="">Select department</option>{audienceOptions.departments.map((department) => <option key={department}>{department}</option>)}</select>}
                {announcementForm.audienceType === 'Year' && <select aria-label="Target year" value={announcementForm.audienceValue} onChange={(event) => setAnnouncementForm({ ...announcementForm, audienceValue: event.target.value })}><option value="">Select year</option>{[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select>}
                {announcementForm.audienceType === 'Mentor Group' && <select aria-label="Target mentor group" value={announcementForm.audienceValue} onChange={(event) => setAnnouncementForm({ ...announcementForm, audienceValue: event.target.value })}><option value="">Select mentor</option>{mentors.filter((mentor) => mentor.status !== 'Inactive').map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}</select>}
                <button disabled={saving} className="glass-btn disabled:opacity-50">{saving ? 'Publishing…' : 'Publish and notify students'}</button>
              </form>
              <section className="space-y-3">
                <h2 className="font-semibold text-slate-900">Published announcements</h2>
                {announcements.length === 0 && <div className="chart-panel text-sm text-slate-500">No announcements published yet.</div>}
                {announcements.map((announcement) => <article key={announcement._id || announcement.id} className="chart-panel">
                  <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{announcement.title}</h3><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{announcement.priority}</span></div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{announcement.message}</p>
                  <p className="mt-3 text-xs text-slate-500">Audience: {announcement.audience?.type || 'All Students'}{announcement.audience?.value ? ` · ${announcement.audience.value}` : ''}</p>
                </article>)}
              </section>
            </div>
          )}
          {tab === 'settings' && (
            <form onSubmit={saveSettings} className="chart-panel max-w-2xl space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Bot size={20} />AI assistant settings</h2>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={settings.chatbotEnabled} onChange={(event) => setSettings({ ...settings, chatbotEnabled: event.target.checked })} />
                <span><span className="block font-semibold text-slate-800">Enable the CampusPulse chatbot</span><span className="text-sm text-slate-500">When disabled, the API also blocks chat requests for every role.</span></span>
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">Assistant welcome message
                <textarea required maxLength={500} rows={3} value={settings.assistantWelcome} onChange={(event) => setSettings({ ...settings, assistantWelcome: event.target.value })} />
              </label>
              <button type="submit" className="glass-btn">Save settings</button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
