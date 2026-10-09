import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, UserRound } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import EarlySuccessPage from './EarlySuccessPage'

export default function StudentDashboardPage() {
  const { auth } = useAuth()
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const studentId = auth?.user?.studentId
    if (!studentId) {
      setError('Your account is not linked to a student profile. Contact your administrator.')
      return
    }
    let active = true
    api.get(`/students/${encodeURIComponent(studentId)}`)
      .then((response) => { if (active) setStudent(response.data) })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Your student dashboard could not be loaded.')
      })
    return () => { active = false }
  }, [auth?.user?.studentId])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-600 p-6 text-white shadow-soft">
        <div className="flex items-center gap-2 text-indigo-100"><GraduationCap size={20} /> Student dashboard</div>
        <h1 className="mt-2 text-3xl font-bold">Welcome, {auth?.user?.name || 'Student'}</h1>
        <p className="mt-2 text-indigo-100">Your academic information and support stay private to your account.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {student && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['CGPA', student.cgpa ?? '—', GraduationCap],
              ['Attendance', student.attendance == null ? '—' : `${student.attendance}%`, CalendarDays],
              ['Academic performance', student.academicPerformance ?? '—', BookOpen],
              ['Success score', student.successScore ?? '—', ArrowRight]
            ].map(([label, value, Icon]) => (
              <div key={label} className="metric-card">
                <div className="flex items-center justify-between text-sm text-slate-500">{label}<Icon size={17} className="text-indigo-600" /></div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
          <EarlySuccessPage compact />
          <div className="grid gap-4 md:grid-cols-3">
            <Link to={`/students/${encodeURIComponent(student.studentId)}`} className="chart-panel flex items-center justify-between">
              <span><span className="block font-semibold text-slate-900">My performance</span><span className="text-sm text-slate-500">View your profile and academic data</span></span><ArrowRight size={18} className="text-indigo-600" />
            </Link>
            <Link to="/my-mentor" className="chart-panel flex items-center justify-between">
              <span><span className="block font-semibold text-slate-900">My mentor</span><span className="text-sm text-slate-500">Contact your mentor and view support</span></span><UserRound size={18} className="text-indigo-600" />
            </Link>
            <Link to="/study-plan" className="chart-panel flex items-center justify-between">
              <span><span className="block font-semibold text-slate-900">Study timetable</span><span className="text-sm text-slate-500">Review your personalized weekly plan</span></span><CalendarDays size={18} className="text-indigo-600" />
            </Link>
          </div>
        </>
      )}
      {!student && !error && <div className="chart-panel py-8 text-center text-slate-500">Loading your private student dashboard…</div>}
    </div>
  )
}
