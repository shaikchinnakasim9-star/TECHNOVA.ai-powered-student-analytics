import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  ChevronDown,
  Database,
  Download,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  UserCog,
  TrendingUp,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  MessageCircle,
  Megaphone,
  Send,
  X
} from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import RiskPage from './pages/RiskPage'
import SegmentsPage from './pages/SegmentsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import InterventionsPage from './pages/InterventionsPage'
import DataImportPage from './pages/DataImportPage'
import StudentProfilePage from './pages/StudentProfilePage'
import LoginPage from './pages/LoginPage'
import EngagementPage from './pages/EngagementPage'
import FeeDetailsPage from './pages/FeeDetailsPage'
import StudyPlanPage from './pages/StudyPlanPage'
import EarlySuccessPage from './pages/EarlySuccessPage'
import AdminManagementPage from './pages/AdminManagementPage'
import MentorDashboardPage from './pages/MentorDashboardPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import MyMentorPage from './pages/MyMentorPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import api from './services/api'

function ProtectedRoute({ children }) {
  const { auth } = useAuth()
  return auth ? children : <Navigate to="/login" replace />
}

function EarlySuccessRoute() {
  const { studentId } = useParams()
  const { auth } = useAuth()
  if (auth?.user?.role === 'Student' && studentId) return <Navigate to="/early-success" replace />
  return <EarlySuccessPage studentId={studentId} />
}

function AppShell() {
  const { auth, logout } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hi! Ask about your progress, request a study task, or say “show my timetable” to view your personalized weekly plan.' }
  ])
  const [studyDuration, setStudyDuration] = useState(30)
  const [studyProgressSaving, setStudyProgressSaving] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ studentId: '', subject: '', understanding: '3', notes: '' })
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackReports, setFeedbackReports] = useState([])
  const [feedbackError, setFeedbackError] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!auth) return
    let active = true
    const loadNotifications = async () => {
      try {
        const campusResponse = await api.get('/management/notifications')
        const earlyResponse = auth?.user?.role === 'Student' ? await api.get('/early-success') : null
        if (!active) return
        const campusNotifications = (campusResponse.data || []).map((item) => ({
          id: item.id || item._id,
          title: item.title,
          detail: item.message,
          tone: item.priority === 'Urgent Support' ? 'danger' : item.priority === 'Attention' ? 'warning' : 'info',
          status: item.readAt ? 'Read' : 'Unread',
          studentId: item.studentId,
          type: item.type
        }))
        const earlyNotifications = (earlyResponse?.data?.notifications || []).map((item) => ({
          id: item.id || item._id,
          title: item.title,
          detail: item.message,
          tone: item.priority === 'Urgent Support' ? 'danger' : 'warning',
          status: item.status,
          studentId: auth.user.studentId,
          type: 'early-success'
        }))
        setNotifications([...earlyNotifications, ...campusNotifications])
      } catch (error) {
        if (active) setToast(error.response?.data?.message || 'Notifications could not be loaded.')
      }
    }
    setNotifications([])
    loadNotifications()
    const poll = window.setInterval(loadNotifications, 30 * 1000)
    return () => {
      active = false
      window.clearInterval(poll)
    }
  }, [auth?.user?.id, auth?.user?.role])

  useEffect(() => {
    if (!auth || auth.user.role === 'Mentor' || auth.user.role === 'Faculty') return
    let active = true
    api.get('/management/chatbot')
      .then((response) => {
        if (active) setChatMessages([{ role: 'assistant', text: response.data.assistantWelcome }])
      })
      .catch((error) => {
        if (active) setToast(error.response?.data?.message || 'Chatbot settings could not be loaded.')
      })
    return () => { active = false }
  }, [auth?.user?.id, auth?.user?.role])

  const sendChatText = async (message) => {
    if (!message || chatLoading) return

    setChatMessages((current) => [...current, { role: 'user', text: message }])
    setChatLoading(true)
    try {
      const response = await api.post('/chat', { message })
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: response.data.reply,
        options: response.data.options,
        timetable: response.data.timetable,
        studyTimetable: response.data.timetable?.type === 'study' ? response.data.timetable : null,
        studyTask: response.data.studyTask
      }])
    } catch (error) {
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: error.response?.data?.message || 'Sorry, I could not reach the assistant. Please try again.'
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const requestStudyRecommendation = async () => {
    if (chatLoading) return
    setChatLoading(true)
    try {
      const response = await api.post('/chat/study/recommendation', { availableMinutes: studyDuration })
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: response.data.reply,
        studyTask: response.data.studyTask
      }])
    } catch (error) {
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: error.response?.data?.message || 'Could not create a study recommendation. Please try again.'
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const recordStudyProgress = async (studyTask, status, messageIndex) => {
    if (studyProgressSaving) return
    setStudyProgressSaving(true)
    try {
      const response = await api.post('/chat/study/progress', {
        taskId: studyTask.taskId,
        status,
        availableMinutes: studyDuration
      })
      setChatMessages((current) => [
        ...current.map((item, index) => index === messageIndex ? { ...item, studyResult: status } : item),
        {
          role: 'assistant',
          text: response.data.reply,
          studyTask: response.data.studyTask
        }
      ])
    } catch (error) {
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: error.response?.data?.message || 'Could not save your study progress. Please try again.'
      }])
    } finally {
      setStudyProgressSaving(false)
    }
  }

  const sendChatMessage = (event) => {
    event.preventDefault()
    const message = chatInput.trim()
    if (!message || chatLoading) return
    setChatInput('')
    sendChatText(message)
  }

  const submitSubjectFeedback = async (event) => {
    event.preventDefault()
    if (feedbackLoading) return

    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const payload = {
        subject: feedbackForm.subject,
        understanding: Number(feedbackForm.understanding),
        notes: feedbackForm.notes
      }
      if (auth?.user?.role !== 'Student') payload.studentId = feedbackForm.studentId
      const response = await api.post('/feedback', payload)
      const report = response.data.feedback
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: `Thanks, your feedback for ${report.subject} is recorded as "${report.understandingLabel}" for ${report.studentId}.`
      }])
      setFeedbackForm({ studentId: '', subject: '', understanding: '3', notes: '' })
      setShowFeedbackForm(false)
    } catch (error) {
      setFeedbackError(error.response?.data?.message || 'Could not submit feedback. Please try again.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const loadFeedbackReports = async () => {
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const response = await api.get('/feedback')
      setFeedbackReports(response.data.data)
    } catch (error) {
      setFeedbackError(error.response?.data?.message || 'Could not load feedback reports.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await api.get(`/students?search=${encodeURIComponent(searchTerm)}&limit=5`)
        setSearchResults(response.data.data || [])
      } catch (error) {
        setSearchResults([])
      }
    }, 200)

    return () => clearTimeout(timeout)
  }, [searchTerm])

  const navItems = useMemo(() => {
    const role = auth?.user?.role
    if (!role) return []
    if (role === 'Admin') return [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Students', to: '/admin/manage?tab=students', icon: Users },
      { label: 'Mentors', to: '/admin/manage?tab=mentors', icon: UserCog },
      { label: 'Events', to: '/admin/manage?tab=events', icon: CalendarDays },
      { label: 'Announcements', to: '/admin/manage?tab=announcements', icon: Bell },
      { label: 'Analytics', to: '/analytics', icon: BarChart3 },
      { label: 'Segments', to: '/segments', icon: FolderKanban },
      { label: 'Interventions', to: '/interventions', icon: Workflow },
      { label: 'Data Integration', to: '/data', icon: Database },
      { label: 'Settings', to: '/admin/manage?tab=settings', icon: Settings }
    ]
    if (role === 'Mentor' || role === 'Faculty') return [
      { label: 'Dashboard', to: '/mentor', icon: LayoutDashboard },
      { label: 'My Students', to: '/mentor', icon: Users },
      { label: 'Events', to: '/engagement', icon: CalendarDays },
      { label: 'Notifications', to: '/mentor', icon: Bell }
    ]
    return [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'My Performance', to: '/students', icon: Users },
      { label: 'My Mentor', to: '/my-mentor', icon: UserCog },
      { label: 'Timetable', to: '/study-plan', icon: CalendarDays },
      { label: 'Events & Announcements', to: '/engagement', icon: Megaphone },
      { label: 'Early Success Alert', to: '/early-success', icon: ShieldCheck },
      { label: 'Fee Details', href: 'https://nie-fee-check.blogspot.com/', icon: CreditCard }
    ]
  }, [auth?.user?.role])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-200 bg-slate-900 p-5 text-slate-100">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500 p-2 shadow-soft"><Sparkles size={20} /></div>
            <div>
              <div className="text-xl font-bold">CampusPulse AI</div>
              <div className="text-xs text-slate-300">Student Success Platform</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ label, to, href, icon: Icon }) => (
              href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sidebar-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  <Icon size={18} />
                  {label}
                </a>
              ) : (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) => `sidebar-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition ${isActive ? 'active' : 'hover:bg-slate-800'}`}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              )
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-700">
                <GraduationCap size={18} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">University</div>
                <div className="text-lg font-semibold text-slate-800">CampusPulse {auth?.user?.role === 'Admin' ? 'Admin Console' : auth?.user?.role === 'Mentor' || auth?.user?.role === 'Faculty' ? 'Mentor Workspace' : 'Student Portal'}</div>
              </div>
            </div>

            {auth?.user?.role !== 'Student' && (
              <div className="relative w-full max-w-xl">
                <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student name, ID, department..."
                  className="pl-10"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
                    {searchResults.map((student) => (
                      <button
                        key={student.studentId}
                        onClick={() => {
                          navigate(`/students/${student.studentId}`)
                          setSearchTerm('')
                          setSearchResults([])
                        }}
                        className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <div>
                          <div className="font-medium text-slate-700">{student.name}</div>
                          <div className="text-xs text-slate-500">{student.studentId} • {student.department}</div>
                        </div>
                        <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">{student.riskLevel}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowNotifications((value) => !value)}
                className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
              >
                <Bell size={18} />
                {notifications.filter((item) => item.status !== 'Read').length > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {notifications.filter((item) => item.status !== 'Read').length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-28 top-14 z-30 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Notifications</div>
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={async () => {
                        setShowNotifications(false)
                        setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, status: 'Read' } : notification))
                        try {
                          if (item.type === 'early-success') {
                            await api.patch(`/early-success/notifications/${encodeURIComponent(item.id)}/read`)
                          } else {
                            await api.patch(`/management/notifications/${encodeURIComponent(item.id)}/read`)
                          }
                        } catch (error) {
                          setToast(error.response?.data?.message || 'Notification could not be marked as read.')
                        }
                        if (auth?.user?.role === 'Student') navigate(item.type === 'early-success' ? '/early-success' : item.type === 'announcement' ? '/engagement' : '/my-mentor')
                        else if ((auth?.user?.role === 'Mentor' || auth?.user?.role === 'Faculty') && item.studentId) navigate(`/students/${encodeURIComponent(item.studentId)}`)
                        else setToast(item.title)
                      }}
                      className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.tone === 'danger' ? 'bg-rose-500' : item.tone === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.detail}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                  {auth?.user?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{auth?.user?.name || 'Admin'}</div>
                  <div className="text-xs text-slate-500">{auth?.user?.role || 'Admin'}</div>
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </header>

          {toast && (
            <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-soft">
              {toast}
            </div>
          )}

          {auth && auth.user.role !== 'Mentor' && auth.user.role !== 'Faculty' && (
            <div className="fixed bottom-6 right-6 z-40">
              {showChat && (
                <section className="mb-3 flex h-[min(32rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label="CampusPulse chat assistant">
                  <div className="flex items-center justify-between bg-indigo-700 px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} />
                      <div>
                        <div className="font-semibold">CampusPulse Assistant</div>
                        <div className="text-xs text-indigo-100">Student success and campus help</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowChat(false)} aria-label="Close chat" className="rounded-lg p-1 hover:bg-white/10">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3" aria-live="polite">
                    {chatMessages.map((item, index) => (
                      <div key={`${item.role}-${index}`} className={`max-w-[90%] ${item.role === 'user' ? 'ml-auto' : ''}`}>
                        <div className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-5 ${item.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                          {item.text}
                        </div>
                        {item.options?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.options.map((branch) => (
                              <button
                                key={branch}
                                type="button"
                                disabled={chatLoading}
                                onClick={() => sendChatText(`Show ${branch} timetable`)}
                                className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                              >
                                {branch}
                              </button>
                            ))}
                          </div>
                        )}
                        {item.timetable?.imageUrl && (
                          <figure className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                            <figcaption className="mb-2 text-xs font-semibold text-slate-700">{item.timetable.branch} Timetable</figcaption>
                            <a href={item.timetable.imageUrl} target="_blank" rel="noopener noreferrer">
                              <img src={item.timetable.imageUrl} alt={`${item.timetable.branch} weekly timetable`} className="h-auto w-full rounded-lg" />
                            </a>
                          </figure>
                        )}
                        {item.studyTimetable?.unavailable && (
                          <div role="status" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                            Your timetable needs current subject marks first. <NavLink to="/study-plan" onClick={() => setShowChat(false)} className="font-semibold underline">Open Study Plan</NavLink>
                          </div>
                        )}
                        {item.studyTimetable?.dailyPlan?.length > 0 && (
                          <article className="mt-2 space-y-3 rounded-xl border border-indigo-200 bg-white p-3 text-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">Your weekly study timetable</div>
                              <span className="text-[10px] text-slate-500">{item.studyTimetable.availableDailyHours}h/day · starts {item.studyTimetable.startTime}</span>
                            </div>
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {item.studyTimetable.dailyPlan.map((day) => (
                                <section key={day.day} className="rounded-lg bg-indigo-50 p-2">
                                  <h3 className="text-xs font-semibold text-indigo-900">{day.day}</h3>
                                  {day.sessions.length ? (
                                    <ul className="mt-1 space-y-1">
                                      {day.sessions.map((session, sessionIndex) => (
                                        <li key={`${day.day}-${session.startTime}-${sessionIndex}`} className="text-[11px] leading-4 text-slate-700">
                                          <span className="font-medium">{session.startTime}–{session.endTime}</span> · {session.type}: {session.label} ({session.minutes} min)
                                        </li>
                                      ))}
                                    </ul>
                                  ) : <p className="mt-1 text-[11px] text-slate-500">No focused study block is scheduled for this day.</p>}
                                </section>
                              ))}
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-indigo-100 pt-2 text-[11px]">
                              <span>Planned {item.studyTimetable.totals.recommendedDailyMinutes} min/day · {item.studyTimetable.totals.remainingDailyMinutes} min flexible</span>
                              <NavLink to="/study-plan" onClick={() => setShowChat(false)} className="shrink-0 font-semibold text-indigo-700 underline">Edit plan</NavLink>
                            </div>
                          </article>
                        )}
                        {item.studyTask && (
                          <article className="mt-2 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-slate-700">
                            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">🎯 Study this now</div>
                            <div className="space-y-1 text-sm">
                              <div><span className="font-semibold">Subject:</span> {item.studyTask.subject}</div>
                              <div><span className="font-semibold">Topic:</span> {item.studyTask.topic}</div>
                              <div><span className="font-semibold">Duration:</span> {item.studyTask.duration} minutes</div>
                              <div><span className="font-semibold">Priority:</span> {item.studyTask.priority}</div>
                            </div>
                            <div className="text-xs leading-5"><span className="font-semibold">Why?</span> {item.studyTask.explanation}</div>
                            <div className="text-xs leading-5"><span className="font-semibold">How to study:</span> {item.studyTask.method}</div>
                            {item.studyTask.material && (
                              <a href={item.studyTask.material.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 underline">
                                <Download size={13} /> Open {item.studyTask.material.label}
                              </a>
                            )}
                            {item.studyResult ? (
                              <div className="rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-emerald-700">Marked: {item.studyResult}</div>
                            ) : (
                              <div className="grid grid-cols-1 gap-1.5">
                                {[
                                  ['Completed', '✓ Completed'],
                                  ['Partially Completed', '⏳ Partially Completed'],
                                  ['Not Completed', '✕ Not Completed']
                                ].map(([status, label]) => (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={studyProgressSaving}
                                    onClick={() => recordStudyProgress(item.studyTask, status, index)}
                                    className="rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </article>
                        )}
                      </div>
                    ))}
                    {chatLoading && <div className="w-fit rounded-2xl bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">Thinking…</div>}
                    {feedbackReports.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent subject feedback</div>
                        {feedbackReports.map((report) => (
                          <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800">{report.subject} · {report.studentId}</span>
                              <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{report.understanding}/5</span>
                            </div>
                            <div className="mt-1 text-slate-600">{report.understandingLabel}</div>
                            {report.notes && <p className="mt-1 text-slate-500">{report.notes}</p>}
                          </article>
                        ))}
                      </div>
                    )}
                    {feedbackError && <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{feedbackError}</div>}
                  </div>
                  {showFeedbackForm && (
                    <form onSubmit={submitSubjectFeedback} className="space-y-2 border-t border-slate-200 bg-white p-3">
                      {auth?.user?.role !== 'Student' && (
                        <input
                          value={feedbackForm.studentId}
                          onChange={(event) => setFeedbackForm((current) => ({ ...current, studentId: event.target.value.trim().toUpperCase() }))}
                          required
                          aria-label="Student ID for feedback"
                          placeholder="Student ID (e.g. STU1000)"
                        />
                      )}
                      <input
                        value={feedbackForm.subject}
                        onChange={(event) => setFeedbackForm((current) => ({ ...current, subject: event.target.value }))}
                        required
                        minLength={2}
                        maxLength={100}
                        aria-label="Subject"
                        placeholder="Subject (e.g. Mathematics)"
                      />
                      <label className="block text-xs font-medium text-slate-600" htmlFor="understanding-rating">How well do you understand it?</label>
                      <select
                        id="understanding-rating"
                        value={feedbackForm.understanding}
                        onChange={(event) => setFeedbackForm((current) => ({ ...current, understanding: event.target.value }))}
                      >
                        <option value="1">1 · Not understanding</option>
                        <option value="2">2 · Need a lot of help</option>
                        <option value="3">3 · Partly understand</option>
                        <option value="4">4 · Mostly understand</option>
                        <option value="5">5 · Understand well</option>
                      </select>
                      <textarea
                        value={feedbackForm.notes}
                        onChange={(event) => setFeedbackForm((current) => ({ ...current, notes: event.target.value }))}
                        maxLength={1000}
                        rows={2}
                        aria-label="Additional feedback"
                        placeholder="What topic is difficult? (optional)"
                      />
                      <button type="submit" disabled={feedbackLoading} className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {feedbackLoading ? 'Submitting…' : 'Submit subject feedback'}
                      </button>
                    </form>
                  )}
                  {!showFeedbackForm && (
                    <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
                      <button type="button" onClick={() => { setFeedbackError(''); setShowFeedbackForm(true) }} className="flex-1 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                        Report subject understanding
                      </button>
                      {auth?.user?.role !== 'Student' && (
                        <button type="button" onClick={loadFeedbackReports} disabled={feedbackLoading} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                          View reports
                        </button>
                      )}
                    </div>
                  )}
                  {auth?.user?.role === 'Student' && (
                    <div className="space-y-2 border-t border-slate-200 bg-indigo-50 p-3">
                      <div className="flex items-center gap-2">
                        <label htmlFor="study-duration" className="shrink-0 text-xs font-semibold text-slate-700">Available study time</label>
                        <select id="study-duration" value={studyDuration} onChange={(event) => setStudyDuration(Number(event.target.value))} className="min-w-0 flex-1">
                          {[15, 25, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={requestStudyRecommendation} disabled={chatLoading} className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        🎯 What Should I Study Now?
                      </button>
                      <button type="button" onClick={() => sendChatText('Show my weekly study timetable')} disabled={chatLoading} className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                        📅 Show my weekly timetable
                      </button>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <a href="/study-materials/ml-unit-5-question-paper.pdf" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 underline">ML Unit 5 paper</a>
                        <a href="/study-materials/aiml-dlco-question-paper.pdf" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 underline">AIML DLCO paper</a>
                      </div>
                    </div>
                  )}
                  <form onSubmit={sendChatMessage} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
                    <input
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      maxLength={500}
                      aria-label="Message the assistant"
                      placeholder="Ask about students or events..."
                      className="min-w-0 flex-1"
                    />
                    <button type="submit" aria-label="Send message" disabled={!chatInput.trim() || chatLoading} className="rounded-xl bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                      <Send size={17} />
                    </button>
                  </form>
                </section>
              )}
              <button type="button" onClick={() => setShowChat((current) => !current)} aria-expanded={showChat} aria-label={showChat ? 'Close assistant chat' : 'Open assistant chat'} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700">
                {showChat ? <X size={23} /> : <MessageCircle size={23} />}
              </button>
            </div>
          )}

          <div className="p-6">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute>{auth?.user?.role === 'Admin' ? <DashboardPage /> : auth?.user?.role === 'Mentor' || auth?.user?.role === 'Faculty' ? <MentorDashboardPage /> : <StudentDashboardPage />}</ProtectedRoute>} />
              <Route path="/admin/manage" element={<ProtectedRoute>{auth?.user?.role === 'Admin' ? <AdminManagementPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/mentor" element={<ProtectedRoute>{auth?.user?.role === 'Mentor' || auth?.user?.role === 'Faculty' ? <MentorDashboardPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
              <Route path="/my-mentor" element={<ProtectedRoute>{auth?.user?.role === 'Student' ? <MyMentorPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/engagement" element={<ProtectedRoute><EngagementPage /></ProtectedRoute>} />
              <Route path="/fees" element={<ProtectedRoute>{auth?.user?.role === 'Admin' || auth?.user?.role === 'Student' ? <FeeDetailsPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/study-plan" element={<ProtectedRoute>{auth?.user?.role === 'Student' ? <StudyPlanPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/early-success/:studentId?" element={<ProtectedRoute>{auth?.user?.role === 'Admin' || auth?.user?.role === 'Student' ? <EarlySuccessRoute /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/students/:id" element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />
              <Route path="/risk" element={<ProtectedRoute>{auth?.user?.role === 'Admin' ? <RiskPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/segments" element={<ProtectedRoute>{auth?.user?.role === 'Admin' ? <SegmentsPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute>{auth?.user?.role === 'Admin' ? <AnalyticsPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/interventions" element={<ProtectedRoute>{auth?.user?.role === 'Admin' ? <InterventionsPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="/data" element={<ProtectedRoute>{auth?.user?.role === 'Admin' ? <DataImportPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
