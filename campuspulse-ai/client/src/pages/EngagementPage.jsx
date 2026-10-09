import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, Megaphone } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function EngagementPage() {
  const { auth } = useAuth()
  const isStudent = auth?.user?.role === 'Student'
  const [events, setEvents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [registeredEventIds, setRegisteredEventIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/management/events'),
      api.get('/management/announcements'),
      isStudent ? api.get('/management/events/registrations/mine') : Promise.resolve({ data: [] })
    ])
      .then(([eventsResponse, announcementsResponse, registrationsResponse]) => {
        if (!active) return
        setEvents(eventsResponse.data || [])
        setAnnouncements(announcementsResponse.data || [])
        setRegisteredEventIds((registrationsResponse.data || []).map((registration) => registration.eventId))
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Campus updates could not be loaded.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isStudent])

  const toggleRegistration = async (event) => {
    const eventId = event._id || event.id
    const registered = registeredEventIds.includes(eventId)
    setError('')
    try {
      if (registered) await api.delete(`/management/events/${encodeURIComponent(eventId)}/register`)
      else await api.post(`/management/events/${encodeURIComponent(eventId)}/register`)
      setRegisteredEventIds((current) => registered
        ? current.filter((id) => id !== eventId)
        : [...current, eventId])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Event registration could not be updated.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-indigo-100">Campus updates</div>
            <h1 className="mt-2 text-3xl font-bold">Events and announcements</h1>
            <p className="mt-2 max-w-2xl text-indigo-100">Published events and messages targeted to your student profile.</p>
          </div>
          <CalendarDays size={44} className="text-white/80" />
        </div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {loading ? <div className="chart-panel p-8 text-center text-slate-500">Loading campus updates…</div> : (
        <>
          <section className="space-y-4">
            <div><h2 className="text-xl font-bold text-slate-900">Upcoming events</h2><p className="text-sm text-slate-500">Events published for your department and year.</p></div>
            {events.length === 0 ? <div className="chart-panel text-sm text-slate-500">There are no published events for your profile right now.</div> : (
              <div className="grid gap-5 md:grid-cols-2">
                {events.map((event) => (
                  <article key={event._id || event.id} className="chart-panel flex flex-col">
                    {event.imageUrl && <img src={event.imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />}
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{event.department || 'All departments'}</span>
                      {event.year && event.year !== 'All' && <span className="text-xs text-slate-500">Year {event.year}</span>}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-900">{event.title}</h3>
                    <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{event.description}</p>
                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><CalendarDays size={16} className="text-indigo-600" />{new Date(event.date).toLocaleDateString()} · {event.time}</div>
                      <div className="flex items-center gap-2"><MapPin size={16} className="text-indigo-600" />{event.location}</div>
                      {event.registrationDeadline && <div className="text-xs text-slate-500">Register by {new Date(event.registrationDeadline).toLocaleDateString()}</div>}
                    </div>
                    {isStudent && (
                      <button type="button" onClick={() => toggleRegistration(event)} className="secondary-btn mt-4">
                        {registeredEventIds.includes(event._id || event.id) ? 'Cancel registration' : 'Register for event'}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div><h2 className="text-xl font-bold text-slate-900">Announcements</h2><p className="text-sm text-slate-500">Updates selected for your audience.</p></div>
            {announcements.length === 0 ? <div className="chart-panel text-sm text-slate-500">There are no announcements for your account.</div> : announcements.map((announcement) => (
              <article key={announcement._id || announcement.id} className="chart-panel">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><Megaphone size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{announcement.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-semibold ${announcement.priority === 'Urgent Support' ? 'bg-rose-100 text-rose-700' : announcement.priority === 'Attention' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{announcement.priority}</span></div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{announcement.createdAt ? new Date(announcement.createdAt).toLocaleString() : ''}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
