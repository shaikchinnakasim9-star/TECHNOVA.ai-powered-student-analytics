import { useEffect, useState } from 'react'
import { Activity, BookOpenCheck, Clock3, GraduationCap, Plus, Save, Trash2 } from 'lucide-react'
import api from '../services/api'

const makeSubject = () => ({
  subject: '',
  currentScore: '',
  internalScore: '',
  previousExamScore: '',
  assignmentScore: '',
  quizScore: '',
  attendance: '',
  trend: 'auto',
  difficulty: 'medium',
  examDate: '',
  targetScore: 80,
  backlog: false
})

const scoreFields = [
  ['currentScore', 'Current %', true],
  ['internalScore', 'Internal %'],
  ['previousExamScore', 'Previous exam %'],
  ['assignmentScore', 'Assignment %'],
  ['quizScore', 'Quiz %'],
  ['attendance', 'Attendance %']
]

const priorityStyles = {
  'Very High': 'bg-rose-100 text-rose-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-amber-100 text-amber-800',
  Normal: 'bg-sky-100 text-sky-700',
  Low: 'bg-blue-100 text-blue-700',
  Maintenance: 'bg-emerald-100 text-emerald-700'
}

function formatHours(minutes) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div key={label} className="metric-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
        </div>
        <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700"><Icon size={20} /></div>
      </div>
    </div>
  )
}

export default function StudyPlanPage() {
  const [subjects, setSubjects] = useState([makeSubject()])
  const [availableDailyHours, setAvailableDailyHours] = useState(3)
  const [placementMinutesPerDay, setPlacementMinutesPerDay] = useState(20)
  const [startTime, setStartTime] = useState('18:00')
  const [plan, setPlan] = useState(null)
  const [hasSourceMarks, setHasSourceMarks] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await api.get('/study-plan')
        const data = response.data
        setAvailableDailyHours(data.settings.availableDailyHours)
        setPlacementMinutesPerDay(data.settings.placementMinutesPerDay)
        setStartTime(data.settings.startTime)
        setHasSourceMarks(data.hasSourceMarks)
        setSubjects(data.settings.subjects.length
          ? data.settings.subjects.map((subject) => ({
            ...makeSubject(),
            ...subject,
            currentScore: subject.currentScore ?? subject.score ?? '',
            internalScore: subject.internalScore ?? '',
            previousExamScore: subject.previousExamScore ?? '',
            assignmentScore: subject.assignmentScore ?? '',
            quizScore: subject.quizScore ?? '',
            attendance: subject.attendance ?? '',
            examDate: subject.examDate ? new Date(subject.examDate).toISOString().slice(0, 10) : ''
          }))
          : [makeSubject()])
        setPlan(data.plan)
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Could not load your study plan.')
      } finally {
        setLoading(false)
      }
    }
    loadPlan()
  }, [])

  const updateSubject = (index, field, value) => {
    setSubjects((current) => current.map((subject, subjectIndex) =>
      subjectIndex === index ? { ...subject, [field]: value } : subject))
  }

  const calculatePlan = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        availableDailyHours: Number(availableDailyHours),
        placementMinutesPerDay: Number(placementMinutesPerDay),
        startTime,
        subjects: subjects.map((subject) => ({
          ...subject,
          subject: subject.subject.trim(),
          currentScore: subject.currentScore === '' ? '' : Number(subject.currentScore),
          targetScore: Number(subject.targetScore),
          internalScore: subject.internalScore === '' ? null : Number(subject.internalScore),
          previousExamScore: subject.previousExamScore === '' ? null : Number(subject.previousExamScore),
          assignmentScore: subject.assignmentScore === '' ? null : Number(subject.assignmentScore),
          quizScore: subject.quizScore === '' ? null : Number(subject.quizScore),
          attendance: subject.attendance === '' ? null : Number(subject.attendance)
        }))
      }
      const response = await api.put('/study-plan', payload)
      setSubjects(response.data.settings.subjects.map((subject) => ({
        ...makeSubject(),
        ...subject,
        currentScore: subject.currentScore,
        internalScore: subject.internalScore ?? '',
        previousExamScore: subject.previousExamScore ?? '',
        assignmentScore: subject.assignmentScore ?? '',
        quizScore: subject.quizScore ?? '',
        attendance: subject.attendance ?? '',
        targetScore: subject.targetScore ?? 80,
        trend: subject.trend || 'auto',
        difficulty: subject.difficulty || 'medium',
        examDate: subject.examDate ? new Date(subject.examDate).toISOString().slice(0, 10) : ''
      })))
      setPlan(response.data.plan)
      setHasSourceMarks(response.data.hasSourceMarks)
      setNotice('Study hours recalculated from your latest subject performance and saved.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not calculate your study plan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading your study plan…</div>

  const summary = plan?.totals
  const availableHours = plan?.availableWeeklyHours ?? 0
  const recommendedHours = summary?.recommendedWeeklyHours ?? 0

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-800 via-blue-700 to-cyan-700 p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-100">
              <Activity size={16} /> CampusPulse AI
            </div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Performance-based study planner</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
              Turn current marks, trends, exams, coursework, attendance, and subject difficulty into a study schedule that fits your available time.
            </p>
          </div>
          <GraduationCap size={44} className="text-white/80" />
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}
      {!hasSourceMarks && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Subject marks are not yet available from your academic records. Add your current scores below to get a genuinely performance-based plan; unfilled subjects are not assigned invented marks.
        </div>
      )}

      <form onSubmit={calculatePlan} className="space-y-5">
        <section className="chart-panel space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your available study time</h2>
            <p className="mt-1 text-sm text-slate-500">The weekly subject allocation and placement block will never exceed this daily limit.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Study hours per day
              <input type="number" min="0.5" max="16" step="0.5" required value={availableDailyHours} onChange={(event) => setAvailableDailyHours(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Placement prep per day (minutes)
              <input type="number" min="0" max="240" step="5" required value={placementMinutesPerDay} onChange={(event) => setPlacementMinutesPerDay(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Daily plan starts at
              <input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
          </div>
        </section>

        <section className="chart-panel space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Subject performance inputs</h2>
              <p className="mt-1 text-sm text-slate-500">Enter each score as a percentage. Previous exam marks help check the recent trend.</p>
            </div>
            <button type="button" onClick={() => setSubjects((current) => [...current, makeSubject()])} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
              <Plus size={16} /> Add subject
            </button>
          </div>

          <div className="space-y-4">
            {subjects.map((subject, index) => (
              <article key={`subject-${index}`} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">Subject {index + 1}</h3>
                  {subjects.length > 1 && (
                    <button type="button" aria-label={`Remove subject ${index + 1}`} onClick={() => setSubjects((current) => current.filter((_, subjectIndex) => subjectIndex !== index))} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
                    Subject name
                    <input required maxLength={80} value={subject.subject} placeholder="e.g. Database Management Systems" onChange={(event) => updateSubject(index, 'subject', event.target.value)} />
                  </label>
                  {scoreFields.map(([field, label, required]) => (
                    <label key={field} className="space-y-1 text-xs font-medium text-slate-600">
                      {label}
                      <input type="number" min="0" max="100" step="0.1" required={required} value={subject[field]} placeholder={required ? 'Required' : 'Optional'} onChange={(event) => updateSubject(index, field, event.target.value)} />
                    </label>
                  ))}
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Target score %
                    <input type="number" min="0" max="100" required value={subject.targetScore} onChange={(event) => updateSubject(index, 'targetScore', event.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Recent trend
                    <select value={subject.trend} onChange={(event) => updateSubject(index, 'trend', event.target.value)}>
                      <option value="auto">Auto from previous exam</option><option value="declining">Declining</option><option value="stable">Stable</option><option value="improving">Improving</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Subject difficulty
                    <select value={subject.difficulty} onChange={(event) => updateSubject(index, 'difficulty', event.target.value)}>
                      <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="very hard">Very Hard</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Upcoming exam date
                    <input type="date" value={subject.examDate} onChange={(event) => updateSubject(index, 'examDate', event.target.value)} />
                  </label>
                  <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={Boolean(subject.backlog)} onChange={(event) => updateSubject(index, 'backlog', event.target.checked)} />
                    Backlog in this subject
                  </label>
                </div>
              </article>
            ))}
          </div>

          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Save size={17} /> {saving ? 'Calculating…' : 'Calculate my personalized timetable'}
          </button>
        </section>
      </form>

      {plan && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Daily study planned" value={formatHours(summary.academicDailyMinutes)} icon={Clock3} />
            <Metric label="Weekly study planned" value={`${summary.academicWeeklyHours} h`} icon={BookOpenCheck} />
            <Metric label="Practice / revision daily" value={`${formatHours(summary.practiceDailyMinutes)} / ${formatHours(summary.revisionDailyMinutes)}`} icon={Activity} />
            <Metric label="Placement prep weekly" value={`${summary.placementWeeklyHours} h`} icon={GraduationCap} />
          </section>

          <section className="chart-panel space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Weekly subject priorities</h2>
                <p className="mt-1 text-sm text-slate-500">Lower-performing subjects receive proportionally more practice time; stronger subjects retain revision.</p>
              </div>
              <div className="text-sm text-slate-600">
                Weekly limit: <strong>{availableHours} h</strong> · Planned: <strong>{recommendedHours} h</strong> · Remaining: <strong>{(availableHours - recommendedHours).toFixed(1)} h</strong>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {plan.subjects.map((subject) => (
                <article key={subject.subject} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{subject.subject}</h3>
                      <div className="mt-1 text-sm text-slate-600">{subject.dailyMinutes} min/day · {subject.recommendedWeeklyHours} h/week · {subject.performance}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityStyles[subject.priority]}`}>{subject.priority} · {subject.priorityScore}/100</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-2"><span className="block text-xs text-slate-500">Current / target</span>{subject.currentScore}% / {subject.targetScore}%</div>
                    <div className="rounded-lg bg-slate-50 p-2"><span className="block text-xs text-slate-500">Gap</span>{subject.gap} points</div>
                    <div className="rounded-lg bg-slate-50 p-2"><span className="block text-xs text-slate-500">Practice</span>{subject.dailyPracticeMinutes} min/day</div>
                    <div className="rounded-lg bg-slate-50 p-2"><span className="block text-xs text-slate-500">Revision</span>{subject.dailyRevisionMinutes} min/day</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{subject.allocationExplanation}</p>
                  {subject.examDate && <p className="mt-2 text-xs font-medium text-indigo-700">Exam: {new Date(subject.examDate).toLocaleDateString()}</p>}
                  {subject.backlog && <p className="mt-1 text-xs font-semibold text-rose-700">Backlog catch-up included in priority.</p>}
                </article>
              ))}
            </div>
            <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">
              <strong>Time guard:</strong> {formatHours(summary.recommendedDailyMinutes)} is planned out of {formatHours(summary.availableDailyMinutes)} available today. {formatHours(summary.remainingDailyMinutes)} remains unallocated for flexible revision, practice, or breaks.
            </div>
          </section>

          <section className="chart-panel space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Personalized daily timetable</h2>
              <p className="mt-1 text-sm text-slate-500">Schedule starts at {startTime}. Short breaks are shown separately and do not count toward study-time allocations.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plan.dailyPlan.map((day) => (
                <article key={day.day} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-semibold text-slate-900">{day.day}</h3>
                  {day.sessions.length === 0 ? (
                    <p className="text-sm text-slate-500">No sessions allocated.</p>
                  ) : (
                    <ol className="space-y-2">
                      {day.sessions.map((session, index) => (
                        <li key={`${day.day}-${index}`} className={`rounded-lg p-2 text-sm ${session.type === 'Break' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-900'}`}>
                          <div className="font-semibold">{session.startTime}–{session.endTime} · {session.type}</div>
                          <div>{session.label} <span className="text-xs">({session.minutes} min)</span></div>
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="chart-panel">
            <h2 className="text-lg font-semibold text-slate-900">How the recommendation is calculated</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Priority score (0–100) = performance gap × 35% + recent trend × 15% + exam urgency × 20% + backlog × 10% + difficulty × 10% + internal/assignment/quiz weakness × 5% + low attendance when marks are weak × 5%. Performance bands are Critical (&lt;40), Weak (40–59), Moderate (60–69), Good (70–79), Strong (80–89), and Excellent (90–100). Lower-performing subjects receive a larger baseline weekly allocation; declining trends, imminent exams, and backlogs increase it. Your daily availability caps the combined subject and placement schedule.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
