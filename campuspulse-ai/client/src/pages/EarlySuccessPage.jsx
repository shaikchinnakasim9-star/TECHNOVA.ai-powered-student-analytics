import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, Bell, BookOpenCheck, CalendarCheck2, Check, CircleAlert, Clock3, GraduationCap, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import api from '../services/api'

const priorityStyles = {
  Information: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Attention: 'border-amber-200 bg-amber-50 text-amber-900',
  'Urgent Support': 'border-rose-200 bg-rose-50 text-rose-900'
}

const priorityLabel = {
  Information: 'Information',
  Attention: 'Attention',
  'Urgent Support': 'Urgent support recommended'
}

function display(value, suffix = '') {
  return value === null || value === undefined ? 'Not recorded' : `${value}${suffix}`
}

function Metric({ label, value, detail, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
        <span>{label}</span>
        <Icon size={17} className="text-indigo-600" />
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  )
}

export default function EarlySuccessPage({ compact = false, studentId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingId, setMarkingId] = useState('')

  const loadAssessment = async () => {
    setError('')
    try {
      const response = await api.get('/early-success', {
        params: studentId ? { studentId } : undefined
      })
      setData(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load the early success assessment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssessment()
  }, [studentId])

  const markRead = async (notification) => {
    const id = notification.id || notification._id
    if (!id || markingId) return
    setMarkingId(id)
    try {
      await api.patch(`/early-success/notifications/${encodeURIComponent(id)}/read`, studentId ? { studentId } : {})
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          (item.id || item._id) === id ? { ...item, status: 'Read' } : item)
      }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this notification.')
    } finally {
      setMarkingId('')
    }
  }

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Checking your recent progress…</div>
  if (error && !data) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>

  const assessment = data.assessment
  const trendIcon = assessment.trend === 'Improving' ? TrendingUp : assessment.trend === 'Increasing' ? TrendingDown : Activity
  const academicTrendDisplay = assessment.academicChange === null || Math.round(assessment.academicChange) === 0
    ? assessment.trend
    : `${assessment.academicChange < 0 ? '↓' : '↑'} ${Math.abs(assessment.academicChange).toFixed(0)}%`
  const attendanceDetail = assessment.attendance === null || assessment.previousAttendance === null
    ? 'No previous attendance comparison recorded'
    : `${assessment.attendance - assessment.previousAttendance > 0 ? '+' : ''}${(assessment.attendance - assessment.previousAttendance).toFixed(0)} points from previous attendance`

  return (
    <section className="space-y-5" aria-labelledby="early-success-title">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-800 to-blue-700 p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-200">
              <ShieldCheck size={17} /> CampusPulse AI
            </div>
            <h2 id="early-success-title" className="mt-2 text-2xl font-bold sm:text-3xl">CampusPulse Early Success Alert</h2>
            <p className="mt-2 text-sm text-indigo-100">Detect Early. Act Early. Succeed Better.</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3"><GraduationCap size={30} /></div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100">
          A supportive check of the available attendance, marks, coursework, and learning signals. Alerts are early indicators—not predictions of certain failure or permanent labels.
        </p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className={`rounded-2xl border p-5 ${priorityStyles[assessment.priority] || priorityStyles.Information}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            {assessment.priority === 'Information' ? <Check size={19} /> : <CircleAlert size={19} />}
            {priorityLabel[assessment.priority] || assessment.priority}
          </div>
          {assessment.riskScore > 0 && <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">Combined signal indicator: {assessment.riskScore}/100</span>}
        </div>
        <p className="mt-2 text-sm leading-6">
          {assessment.priority === 'Information'
            ? 'No combined early-warning pattern is currently detected in the data available. Keep using your study plan and check in after new results are recorded.'
            : assessment.prediction}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Academic Risk" value={assessment.academicRisk} detail={`Trend: ${assessment.trend}`} icon={trendIcon} />
        <Metric label="Attendance" value={display(assessment.attendance, '%')} detail={attendanceDetail} icon={CalendarCheck2} />
        <Metric label="Academic Trend" value={academicTrendDisplay} detail={assessment.academicScore === null ? 'Marks not recorded' : `Current marks: ${assessment.academicScore.toFixed(0)}%`} icon={BookOpenCheck} />
        <Metric label="Assignments" value={`${assessment.pendingAssignments} pending`} detail={assessment.missedAssignments ? `${assessment.missedAssignments} recorded missed` : assessment.assignmentCompletion === null ? 'Based on recorded coursework' : `${assessment.assignmentCompletion}% completion`} icon={Clock3} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><AlertTriangle size={19} className="text-amber-600" /> Why am I seeing this?</h3>
          {assessment.signals.length ? (
            <ul className="mt-4 space-y-3">
              {assessment.signals.map((signal) => (
                <li key={signal.key} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-800">{signal.label}</div>
                  <div className="mt-1 text-sm leading-5 text-slate-600">{signal.detail}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">There are not enough combined warning signals to create an alert. Missing data is left unknown rather than treated as a problem.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Activity size={19} className="text-indigo-600" /> AI suggestions</h3>
          {assessment.recommendations.length ? (
            <ol className="mt-4 space-y-3">
              {assessment.recommendations.map((suggestion, index) => (
                <li key={suggestion} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{index + 1}</span>
                  {suggestion}
                </li>
              ))}
            </ol>
          ) : <p className="mt-3 text-sm text-slate-600">No specific action is needed right now. Keep following your current study plan.</p>}
          {assessment.attendanceOnly && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">Attendance alert</div>
              <p className="mt-1">Try attending upcoming classes consistently, track your attendance again next week, and ask a mentor about any barriers. Improvement is gradual; no specific percentage is guaranteed.</p>
            </div>
          )}
          {assessment.adaptiveMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{assessment.adaptiveMessage}</div>
          )}
        </div>
      </div>

      {!compact && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Your 7-day improvement plan</h3>
                <p className="mt-1 text-sm text-slate-500">Short, flexible steps based on your recorded subjects, coursework, and upcoming exams.</p>
              </div>
              <Link to="/study-plan" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                Open study plan <ArrowRight size={16} />
              </Link>
            </div>
            <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {assessment.plan.map((item) => (
                <li key={item.day} className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Day {item.day}</div>
                  <div className="mt-2 text-sm leading-5 text-slate-700">{item.action}</div>
                </li>
              ))}
            </ol>
          </div>

          {assessment.progress && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Progress tracking</h3>
              <p className="mt-1 text-sm text-slate-500">Compared with your previous saved daily check; changes are not proof of cause.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Previous attendance" value={display(assessment.progress.previous.attendance, '%')} icon={CalendarCheck2} />
                <Metric label="Attendance change" value={assessment.progress.attendanceChange === null ? 'Not available' : `${assessment.progress.attendanceChange > 0 ? '+' : ''}${assessment.progress.attendanceChange}%`} icon={assessment.progress.attendanceChange > 0 ? TrendingUp : TrendingDown} />
                <Metric label="Indicator change" value={assessment.progress.riskChange === null ? 'Not available' : `${assessment.progress.riskChange > 0 ? '+' : ''}${assessment.progress.riskChange}`} icon={Activity} />
              </div>
              {data.progressHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700">Recent check-ins</h4>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {data.progressHistory.slice(-6).reverse().map((check) => (
                      <li key={check.dateKey} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                        <span className="text-slate-600">{new Date(`${check.dateKey}T00:00:00`).toLocaleDateString()}</span>
                        <span className="text-slate-700">
                          Attendance: {display(check.attendance, '%')} · Indicator: {display(check.riskScore)} · {check.priority}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Support and intervention history</h3>
            {data.interventionHistory.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.interventionHistory.map((item) => (
                  <li key={item.id || item._id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-800">{item.recommendation || item.actionTaken || item.riskType || 'Support check-in'}</div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{item.status || 'Recorded'}{item.outcomeAssessment && item.outcomeAssessment !== 'Not Yet Reviewed' ? ` · ${item.outcomeAssessment}` : ''}</span>
                    </div>
                    {(item.outcome || item.studentResponse || item.notes) && (
                      <p className="mt-1 text-sm text-slate-600">{item.outcome || item.studentResponse || item.notes}</p>
                    )}
                    {item.outcomeRiskScore != null && item.riskBeforeIntervention != null && (
                      <p className="mt-1 text-xs text-slate-500">Recorded indicator: {item.riskBeforeIntervention} before · {item.outcomeRiskScore} after (observational)</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">No faculty interventions have been recorded for this student yet.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Bell size={18} className="text-indigo-600" /> Early alert notifications</h3>
            {data.notifications.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.notifications.map((notification) => {
                  const id = notification.id || notification._id
                  return (
                    <li key={id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                      <div>
                        <div className="font-medium text-slate-800">{notification.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{notification.message}</div>
                        <div className="mt-1 text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</div>
                      </div>
                      {notification.status !== 'Read' && (
                        <button type="button" onClick={() => markRead(notification)} disabled={Boolean(markingId)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                          Mark as read
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : <p className="mt-3 text-sm text-slate-500">No early academic alerts have been generated.</p>}
          </div>
        </>
      )}

      {compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="text-sm text-indigo-900">Want your complete action plan and progress history?</div>
          <Link to={studentId ? `/early-success/${encodeURIComponent(studentId)}` : '/early-success'} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
            View early success center <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  )
}
