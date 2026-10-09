import { useEffect, useState } from 'react'
import api from '../services/api'

export default function SegmentsPage() {
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/students/segments')
      setSegments(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load student segments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-indigo-600">Segmentation</div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">AI Student Segments</h1>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={load} className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-100">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading student segments…</div>
      ) : !error && segments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No segment data is available yet.</div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.name} className="metric-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{segment.name}</h3>
              <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">{segment.count}</span>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between"><span>Avg Success Score</span><strong>{segment.averageSuccessScore}</strong></div>
              <div className="flex justify-between"><span>Avg CGPA</span><strong>{segment.averageCGPA}</strong></div>
              <div className="flex justify-between"><span>Avg Attendance</span><strong>{segment.averageAttendance}%</strong></div>
              <div className="flex justify-between"><span>Placement ready</span><strong>{segment.placementReadiness}%</strong></div>
              <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">Recommended: <span className="font-semibold">{segment.recommendation}</span></div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
