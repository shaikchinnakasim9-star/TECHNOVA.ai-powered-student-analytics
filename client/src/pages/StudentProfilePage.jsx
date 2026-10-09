import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, BarChart3, BookOpen, BrainCircuit, BriefcaseBusiness, CheckCircle2, Plus, Save, Trash2, UserCircle2 } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const tabs = ['Overview', 'Academics', 'Attendance', 'LMS', 'Engagement', 'Skills', 'Placement']

function MetricCard({ label, value, suffix = '' }) {
  const available = value !== null && value !== undefined && value !== ''
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{available ? `${value}${suffix}` : 'Not recorded'}</div>
    </div>
  )
}

function SkillList({ title, skills }) {
  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {skills.length ? (
        <div className="mt-3 space-y-3">
          {skills.map((skill, index) => {
            const score = skill.score === '' || skill.score == null ? null : Number(skill.score)
            const hasScore = score !== null && Number.isFinite(score)
            return (
              <div key={`${skill.skill}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{skill.skill}</span>
                  <span className="text-slate-600">{hasScore ? `${score}%` : 'Score not recorded'}</span>
                </div>
                {hasScore && (
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No {title.toLowerCase()} assessment has been recorded yet.</p>
      )}
    </section>
  )
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const { auth } = useAuth()
  const navigate = useNavigate()
  const studentView = auth?.user?.role === 'Student'
  const adminView = auth?.user?.role === 'Admin'
  const [student, setStudent] = useState(null)
  const [insight, setInsight] = useState(null)
  const [selectedTab, setSelectedTab] = useState('Overview')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [technicalSkills, setTechnicalSkills] = useState([])
  const [softSkills, setSoftSkills] = useState([])
  const [savingSkills, setSavingSkills] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (studentView && auth?.user?.studentId && id !== auth.user.studentId) {
        navigate(`/students/${encodeURIComponent(auth.user.studentId)}`, { replace: true })
        return
      }
      if (studentView && !auth?.user?.studentId) {
        setError('Your account is not linked to a student profile. Contact your college administrator.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const [studentRes, insightRes] = await Promise.all([
          api.get(`/students/${encodeURIComponent(id)}`),
          api.get(`/students/${encodeURIComponent(id)}/insights`)
        ])
        setStudent(studentRes.data)
        setTechnicalSkills((studentRes.data.skillAssessment?.technical || []).map((skill) => ({
          skill: skill.skill,
          score: String(skill.score)
        })))
        setSoftSkills((studentRes.data.skillAssessment?.softSkills || []).map((skill) => ({
          skill: skill.skill,
          score: String(skill.score)
        })))
        setInsight(insightRes.data)
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'This student profile could not be loaded.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, auth?.user?.studentId, studentView, navigate])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const handleGenerateInsight = async () => {
    try {
      const response = await api.get(`/students/${encodeURIComponent(id)}/insights`)
      setInsight(response.data)
      setToast('AI insight refreshed')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'AI insight could not be refreshed.')
    }
  }

  const handleSaveSkills = async (event, type) => {
    event.preventDefault()
    if (savingSkills) return
    setSavingSkills(true)
    setError('')
    try {
      const response = await api.put(`/students/${encodeURIComponent(id)}/skills`, {
        [type]: (type === 'technical' ? technicalSkills : softSkills).map((skill) => ({
          skill: skill.skill.trim(),
          score: Number(skill.score)
        }))
      })
      setStudent((current) => ({
        ...current,
        skillAssessment: {
          ...current.skillAssessment,
          ...response.data
        }
      }))
      setTechnicalSkills(response.data.technical.map((skill) => ({
        skill: skill.skill,
        score: String(skill.score)
      })))
      setSoftSkills(response.data.softSkills.map((skill) => ({
        skill: skill.skill,
        score: String(skill.score)
      })))
      setToast(`${type === 'technical' ? 'Technical' : 'Soft'} skills saved`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Technical skills could not be saved.')
    } finally {
      setSavingSkills(false)
    }
  }

  const handleCreateIntervention = async () => {
    if (!student) return
    await api.post('/interventions', {
      student: student.studentId,
      riskType: student.riskLevel === 'HIGH' ? 'Attendance' : 'Academic',
      priority: student.riskLevel,
      recommendation: insight?.recommendations?.[0] || 'Faculty mentoring',
      assignedFaculty: 'Prof. Rao',
      status: 'Open',
      notes: 'Created from automated student risk evaluation.'
    })
    setToast('Intervention created successfully')
  }

  const subjects = Array.isArray(student?.subjectScores) ? student.subjectScores : []
  const subjectAttendance = Array.isArray(student?.subjectAttendance) && student.subjectAttendance.length
    ? student.subjectAttendance
    : subjects.filter((subject) => subject.attendance !== null && subject.attendance !== undefined)
      .map((subject) => ({ subject: subject.subject, percentage: subject.attendance }))
  const subjectAttendanceScores = subjectAttendance
    .map((item) => Number(item.percentage ?? item.attendance))
    .filter((value) => Number.isFinite(value))
  const recordedBacklogs = subjects.filter((subject) => subject.backlog === true).length

  if (studentView && auth?.user?.studentId && id !== auth.user.studentId) return <Navigate to={`/students/${encodeURIComponent(auth.user.studentId)}`} replace />
  if (loading) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading student profile...</div>
  if (error) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{error}</div>
  if (!student) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Student profile is unavailable.</div>

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
              <UserCircle2 size={42} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{student.name}</div>
              <div className="text-sm text-slate-500">{student.studentId} • {student.department} • Year {student.year}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{studentView ? 'Support Indicator' : 'Risk Badge'}</div>
              <div className={`mt-2 rounded-full px-2 py-1 text-xs font-semibold ${studentView ? 'bg-indigo-100 text-indigo-700' : student.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700' : student.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {student.riskLevel}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Success Score</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{student.successScore}</div>
            </div>
            {adminView && (
              <button type="button" onClick={() => navigate(`/early-success/${encodeURIComponent(student.studentId)}`)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
                Early Success Alert <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${selectedTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="chart-panel">
          {selectedTab === 'Overview' && (
            <>
              <h3 className="mb-4 text-xl font-semibold">{studentView ? `Your success score: ${student.successScore}` : `Why is this student's score ${student.successScore}?`}</h3>
              <div className="space-y-4">
                {student.riskFactors.map((factor) => (
                  <div key={factor.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{factor.name}</span>
                      <span className="text-slate-500">{factor.value}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${factor.value}%` }} />
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">Impact: {factor.impact}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedTab === 'Academics' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="CGPA" value={student.cgpa} />
                <MetricCard label="Academic marks" value={student.academicPerformance} suffix="%" />
                <MetricCard label="Backlogs" value={student.backlogs ?? (subjects.some((subject) => subject.backlog !== undefined) ? recordedBacklogs : null)} />
                <MetricCard label="Assignment completion" value={student.assignmentCompletion} suffix="%" />
              </div>
              <section className="rounded-2xl border border-slate-100 p-4">
                <h3 className="font-semibold text-slate-900">Subject performance</h3>
                {subjects.length ? (
                  <div className="mt-3 space-y-3">
                    {subjects.map((subject, index) => {
                      const mark = subject.currentScore ?? subject.score ?? subject.internalScore
                      return (
                        <div key={`${subject.subject || 'subject'}-${index}`} className="rounded-xl bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-slate-800">{subject.subject || `Subject ${index + 1}`}</span>
                            <span className="text-sm font-semibold text-slate-700">{mark == null ? 'Marks not recorded' : `${mark}%`}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            {subject.previousExamScore != null && <span>Previous assessment: {subject.previousExamScore}%</span>}
                            {subject.internalScore != null && <span>Internal: {subject.internalScore}%</span>}
                            {subject.trend && subject.trend !== 'auto' && <span>Trend: {subject.trend}</span>}
                            {subject.backlog && <span className="font-semibold text-rose-700">Backlog support</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="mt-2 text-sm text-slate-500">Subject-level marks have not been recorded yet.</p>}
              </section>
            </div>
          )}

          {selectedTab === 'Attendance' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Overall attendance" value={student.attendance} suffix="%" />
                {subjectAttendanceScores.length > 0 && (
                  <MetricCard
                    label="Subject attendance average"
                    value={Number((subjectAttendanceScores.reduce((sum, value) => sum + value, 0) / subjectAttendanceScores.length).toFixed(1))}
                    suffix="%"
                  />
                )}
              </div>
              <section className="rounded-2xl border border-slate-100 p-4">
                <h3 className="font-semibold text-slate-900">Subject-wise attendance</h3>
                {subjectAttendance.length ? (
                  <div className="mt-3 space-y-3">
                    {subjectAttendance.map((item, index) => {
                      const attendance = item.percentage ?? item.attendance
                      return (
                        <div key={`${item.subject || 'subject'}-${index}`}>
                          <div className="mb-1 flex justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700">{item.subject || `Subject ${index + 1}`}</span>
                            <span className="text-slate-500">{attendance == null ? 'Not recorded' : `${attendance}%`}</span>
                          </div>
                          {attendance != null && <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, Number(attendance)))}%` }} /></div>}
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="mt-2 text-sm text-slate-500">Subject-wise attendance has not been recorded yet.</p>}
              </section>
            </div>
          )}

          {selectedTab === 'LMS' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">LMS Activity</div><div className="text-2xl font-bold">{student.lmsActivity}%</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Assignments Missed</div><div className="text-2xl font-bold">{student.assignmentMissed}</div></div>
            </div>
          )}

          {selectedTab === 'Engagement' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard label="Engagement score" value={student.engagementScore} suffix="%" />
              <MetricCard label="Events" value={student.events} />
              <MetricCard label="Clubs" value={student.clubs} />
              <MetricCard label="Hackathons" value={student.hackathons} />
              <MetricCard label="Certifications" value={student.certifications} />
            </div>
          )}

          {selectedTab === 'Skills' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-indigo-50 p-4">
                <div className="text-sm text-indigo-700">Overall skills score</div>
                <div className="mt-1 text-2xl font-bold text-indigo-950">
                  {student.skills == null ? 'Not available' : `${student.skills}%`}
                </div>
                <p className="mt-1 text-xs text-indigo-800">
                  {student.skillAssessment
                    ? 'Itemized ratings below come from the latest recorded skills assessment.'
                    : 'Itemized technical and soft-skill ratings have not been recorded yet.'}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">Technical skills</h3>
                    {studentView && (
                      <button
                        type="button"
                        onClick={() => setTechnicalSkills((current) => [...current, { skill: '', score: '' }])}
                        disabled={technicalSkills.length >= 25}
                        className="secondary-btn gap-1 px-2 py-1.5 text-xs"
                      >
                        <Plus size={14} /> Add skill
                      </button>
                    )}
                  </div>
                  {studentView ? (
                    <form onSubmit={(event) => handleSaveSkills(event, 'technical')} className="mt-3 space-y-3">
                      {technicalSkills.length ? technicalSkills.map((skill, index) => (
                        <div key={`technical-${index}`} className="grid grid-cols-[minmax(0,1fr),6rem,2.5rem] items-end gap-2">
                          <label className="min-w-0 text-xs font-medium text-slate-600">
                            Skill name
                            <input
                              required
                              minLength={2}
                              maxLength={60}
                              value={skill.skill}
                              onChange={(event) => setTechnicalSkills((current) => current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, skill: event.target.value } : entry
                              ))}
                              placeholder="e.g. Python"
                              aria-label={`Technical skill ${index + 1}`}
                            />
                          </label>
                          <label className="text-xs font-medium text-slate-600">
                            Proficiency %
                            <input
                              required
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={skill.score}
                              onChange={(event) => setTechnicalSkills((current) => current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, score: event.target.value } : entry
                              ))}
                              placeholder="0–100"
                              aria-label={`Proficiency score for skill ${index + 1}`}
                            />
                          </label>
                          <button
                            type="button"
                            aria-label={`Remove technical skill ${index + 1}`}
                            onClick={() => setTechnicalSkills((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                            className="mb-1 rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-500">Add the technical skills you have learned and rate your current proficiency.</p>
                      )}
                      <p className="text-xs leading-5 text-slate-500">
                        These are self-reported ratings. Add up to 25 skills; scores are from 0 to 100. Your entries are not presented as verified assessments.
                      </p>
                      <button type="submit" disabled={savingSkills} className="glass-btn gap-2">
                        <Save size={15} /> {savingSkills ? 'Saving…' : 'Save technical skills'}
                      </button>
                    </form>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {(student.skillAssessment?.technical || []).length ? (
                        <SkillList title="Technical skills" skills={student.skillAssessment.technical} />
                      ) : (
                        <p className="text-sm text-slate-500">No technical skills assessment has been recorded yet.</p>
                      )}
                    </div>
                  )}
                </section>
                <section className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">Soft skills</h3>
                    {studentView && (
                      <button
                        type="button"
                        onClick={() => setSoftSkills((current) => [...current, { skill: '', score: '' }])}
                        disabled={softSkills.length >= 25}
                        className="secondary-btn gap-1 px-2 py-1.5 text-xs"
                      >
                        <Plus size={14} /> Add skill
                      </button>
                    )}
                  </div>
                  {studentView ? (
                    <form onSubmit={(event) => handleSaveSkills(event, 'softSkills')} className="mt-3 space-y-3">
                      {softSkills.length ? softSkills.map((skill, index) => (
                        <div key={`soft-${index}`} className="grid grid-cols-[minmax(0,1fr),6rem,2.5rem] items-end gap-2">
                          <label className="min-w-0 text-xs font-medium text-slate-600">
                            Skill name
                            <input
                              required
                              minLength={2}
                              maxLength={60}
                              value={skill.skill}
                              onChange={(event) => setSoftSkills((current) => current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, skill: event.target.value } : entry
                              ))}
                              placeholder="e.g. Communication"
                              aria-label={`Soft skill ${index + 1}`}
                            />
                          </label>
                          <label className="text-xs font-medium text-slate-600">
                            Proficiency %
                            <input
                              required
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={skill.score}
                              onChange={(event) => setSoftSkills((current) => current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, score: event.target.value } : entry
                              ))}
                              placeholder="0–100"
                              aria-label={`Proficiency score for soft skill ${index + 1}`}
                            />
                          </label>
                          <button
                            type="button"
                            aria-label={`Remove soft skill ${index + 1}`}
                            onClick={() => setSoftSkills((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                            className="mb-1 rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-500">Add soft skills you have practiced and rate your current proficiency.</p>
                      )}
                      <p className="text-xs leading-5 text-slate-500">
                        These are self-reported ratings, not verified assessments. Add up to 25 skills; scores are from 0 to 100.
                      </p>
                      <button type="submit" disabled={savingSkills} className="glass-btn gap-2">
                        <Save size={15} /> {savingSkills ? 'Saving…' : 'Save soft skills'}
                      </button>
                    </form>
                  ) : (
                    <div className="mt-3">
                      <SkillList title="Soft skills" skills={student.skillAssessment?.softSkills || []} />
                    </div>
                  )}
                </section>
              </div>
              {student.skillAssessment?.assessedAt && (
                <p className="text-xs text-slate-500">
                  Latest skills assessment: {new Date(student.skillAssessment.assessedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {selectedTab === 'Placement' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard label="Placement readiness" value={student.placementReadiness} suffix="%" />
              <MetricCard label="Aptitude score" value={student.aptitudeScore} suffix="%" />
              <MetricCard label="Coding score" value={student.codingScore} suffix="%" />
              <MetricCard label="Mock interview score" value={student.mockInterviewScore} suffix="%" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="chart-panel">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><BrainCircuit size={18} className="text-indigo-600" /> AI Student Insight</div>
            <p className="text-sm leading-6 text-slate-700">{insight?.summary || 'Student requires targeted intervention support.'}</p>
            <div className="mt-4 space-y-2">
              {insight?.recommendations?.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><CheckCircle2 size={16} className="text-emerald-600" /> {item}</div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleGenerateInsight} className="glass-btn">{studentView ? 'Refresh My Insight' : 'Generate AI Insight'}</button>
              {adminView && <button type="button" onClick={handleCreateIntervention} className="secondary-btn">Create Intervention</button>}
            </div>
          </div>

          <div className="chart-panel">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={18} className="text-amber-600" /> Risk Contributors</div>
            <div className="space-y-3">
              {student.riskFactors.map((factor) => (
                <div key={factor.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{factor.name}</span><span>{factor.value}%</span></div>
                  <div className="progress-track"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${factor.value}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
