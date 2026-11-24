import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useVoiceInput } from '../hooks/useVoiceInput'
import UrgencyBadge from '../components/UrgencyBadge'
import KeywordChips from '../components/KeywordChips'

const MAX_CHARS = 1000
const MIN_CHARS = 10

// Department icon helper for visual blocks
const getBlockIcon = (name) => {
  if (name.includes('Computer')) return '💻'
  if (name.includes('Electrical')) return '⚡'
  if (name.includes('Electronics')) return '📡'
  if (name.includes('Cafeteria')) return '☕'
  if (name.includes('Raman')) return '🔬'
  if (name.includes('Auditorium')) return '🎭'
  return '🏢'
}

// Department patterns for live real-time analysis
const DEPT_PATTERNS = {
  'Electrical Maintenance Wing': ['switchboard', 'wire', 'fan', 'light', 'short circuit', 'power', 'socket', 'ac', 'voltage', 'spark', 'electric', 'fuse', 'tripping', 'meter'],
  'Public Health and Civil Works': ['leakage', 'water', 'washroom', 'toilet', 'wall', 'ceiling', 'bench', 'furniture', 'drain', 'cleanliness', 'tap', 'door', 'window', 'slippery', 'plumbing', 'seepage'],
  'IT Services': ['projector', 'wifi', 'internet', 'computer', 'lab pc', 'network', 'software', 'display', 'screen', 'lan', 'system', 'printer', 'audio', 'server'],
}

const HAZARD_TERMS = [
  'exposed wire', 'spark', 'fire', 'flooding', 'slippery', 'gas', 'collapse', 'snake', 'injury', 'shock', 'danger', 'burning', 'smoke'
]

export default function FeedbackForm() {
  const [locations, setLocations] = useState([])
  const [locLoading, setLocLoading] = useState(true)
  const [form, setForm] = useState({ location_id: '', text: '', mode: 'typed' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showManualDropdowns, setShowManualDropdowns] = useState(false)

  // Voice recording timer
  const [recordSeconds, setRecordSeconds] = useState(0)
  const timerRef = useRef(null)

  // Cascading location logic
  const blocks = useMemo(() => [...new Set(locations.map((l) => l.block_name))].sort(), [locations])
  const [selBlock, setSelBlock] = useState('')
  const floors = useMemo(
    () => [...new Set(locations.filter((l) => l.block_name === selBlock).map((l) => l.floor))].sort(),
    [locations, selBlock]
  )
  const [selFloor, setSelFloor] = useState('')
  const rooms = useMemo(
    () => locations.filter((l) => l.block_name === selBlock && l.floor === selFloor),
    [locations, selBlock, selFloor]
  )

  useEffect(() => {
    api.get('/locations')
      .then((res) => {
        setLocations(res.data)
        if (res.data.length > 0) {
          const firstBlock = res.data[0].block_name
          setSelBlock(firstBlock)
          const firstFloor = res.data[0].floor
          setSelFloor(firstFloor)
          setForm((f) => ({ ...f, location_id: res.data[0].location_id.toString() }))
        }
      })
      .catch(() => toast.error('Failed to load campus locations'))
      .finally(() => setLocLoading(false))
  }, [])

  // Voice Input hook
  const { isListening, isSupported, start, stop } = useVoiceInput({
    onTranscript: (transcript) => {
      setForm((f) => ({
        ...f,
        text: f.text ? f.text.trim() + ' ' + transcript : transcript,
        mode: 'voice',
      }))
      toast.success('Voice input transcribed')
    },
  })

  // Timer for voice recording animation
  useEffect(() => {
    if (isListening) {
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isListening])

  // Real-time live AI estimation as student types
  const liveAnalysis = useMemo(() => {
    const raw = (form.text || '').toLowerCase().trim()
    if (raw.length < 5) return null

    const detectedHazards = HAZARD_TERMS.filter((h) => raw.includes(h))

    let bestDept = 'General Administration'
    let bestCount = 0
    for (const [dept, terms] of Object.entries(DEPT_PATTERNS)) {
      const count = terms.filter((t) => raw.includes(t)).length
      if (count > bestCount) {
        bestCount = count
        bestDept = dept
      }
    }

    let estimatedLevel = 'Low'
    let estimatedScore = 0.25
    if (detectedHazards.length > 0) {
      if (raw.includes('spark') || raw.includes('fire') || raw.includes('burn') || raw.includes('danger')) {
        estimatedLevel = 'Critical'
        estimatedScore = 0.85
      } else {
        estimatedLevel = 'High'
        estimatedScore = 0.65
      }
    } else if (raw.includes('not working') || raw.includes('broken') || raw.includes('leak') || raw.includes('slow')) {
      estimatedLevel = 'Medium'
      estimatedScore = 0.50
    }

    return {
      dept: bestDept,
      level: estimatedLevel,
      score: estimatedScore,
      hazards: detectedHazards,
    }
  }, [form.text])

  const validate = () => {
    const e = {}
    if (!form.location_id) e.location = 'Please select a campus department / location'
    if (form.text.trim().length < MIN_CHARS) e.text = `Feedback must be at least ${MIN_CHARS} characters`
    if (form.text.trim().length > MAX_CHARS) e.text = `Feedback must not exceed ${MAX_CHARS} characters`
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await api.post('/surveys', {
        location_id: parseInt(form.location_id),
        raw_text: form.text.trim(),
        input_mode: form.mode,
      })
      setResult(res.data)
      toast.success('Feedback submitted & ticket generated successfully!')
      setForm((f) => ({ ...f, text: '', mode: 'typed' }))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyTicketId = (id) => {
    navigator.clipboard.writeText(`TK-${id}`)
    setCopied(true)
    toast.success('Ticket ID copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const charCount = form.text.length
  const charPct = Math.min((charCount / MAX_CHARS) * 100, 100)
  const selectedLocObj = locations.find((l) => l.location_id.toString() === form.location_id.toString())

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>📝</span> Submit Facility Feedback
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Report facility concerns across university departments. Cleaned and routed automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/my-submissions"
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-none"
          >
            <span>📋</span> View My Tickets
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        
        {/* 1. Location Selector with University Buildings */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>📍</span> 1. Select Department / Campus Building
            </h3>
            {selectedLocObj && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedLocObj.block_name} &bull; {selectedLocObj.floor} {selectedLocObj.room_number ? `&bull; ${selectedLocObj.room_number}` : ''}
              </span>
            )}
          </div>

          {locLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3.5">
              
              {/* Campus Blocks / Departments */}
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Department / Building:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {blocks.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setSelBlock(b)
                        const matchingFloors = [...new Set(locations.filter((l) => l.block_name === b).map((l) => l.floor))].sort()
                        const f = matchingFloors[0] || ''
                        setSelFloor(f)
                        const matchingRoom = locations.find((l) => l.block_name === b && l.floor === f)
                        if (matchingRoom) setForm((prev) => ({ ...prev, location_id: matchingRoom.location_id.toString() }))
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        selBlock === b
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{getBlockIcon(b)}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate leading-snug">{b}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {locations.filter((l) => l.block_name === b).length} areas
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Floors Pills */}
              {floors.length > 0 && (
                <div className="pt-1">
                  <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Floor Level:</label>
                  <div className="flex flex-wrap gap-2">
                    {floors.map((fl) => (
                      <button
                        key={fl}
                        type="button"
                        onClick={() => {
                          setSelFloor(fl)
                          const matchingRoom = locations.find((l) => l.block_name === selBlock && l.floor === fl)
                          if (matchingRoom) setForm((prev) => ({ ...prev, location_id: matchingRoom.location_id.toString() }))
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selFloor === fl
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {fl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rooms & Labs Chips */}
              {rooms.length > 0 && (
                <div className="pt-1">
                  <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Room / Lab / Facility Area:</label>
                  <div className="flex flex-wrap gap-2">
                    {rooms.map((r) => (
                      <button
                        key={r.location_id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, location_id: r.location_id.toString() }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          form.location_id === r.location_id.toString()
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {r.room_number || 'General Area'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Traditional Dropdown Selector */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualDropdowns(!showManualDropdowns)}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 underline font-medium"
                >
                  {showManualDropdowns ? 'Hide manual dropdowns' : '⚙️ Traditional Dropdown View'}
                </button>
                {showManualDropdowns && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="label" htmlFor="block">Department / Block</label>
                      <select id="block" className="input" value={selBlock} onChange={(e) => setSelBlock(e.target.value)}>
                        {blocks.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="floor">Floor</label>
                      <select id="floor" className="input" value={selFloor} onChange={(e) => setSelFloor(e.target.value)}>
                        {floors.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="room">Room Number</label>
                      <select id="room" className="input" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
                        {rooms.map((r) => <option key={r.location_id} value={r.location_id}>{r.room_number || 'General Area'}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
          {errors.location && <p className="text-red-600 text-xs">{errors.location}</p>}
        </div>

        {/* 2. Feedback Input Area */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️</span> 2. Issue Description
            </h3>
            
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                form.mode === 'voice'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {form.mode === 'voice' ? '🎙️ Voice Input' : '⌨️ Typed Input'}
              </span>

              {form.text && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, text: '', mode: 'typed' }))}
                  className="text-xs text-slate-400 hover:text-red-600 underline"
                >
                  Clear text
                </button>
              )}
            </div>
          </div>

          {/* Voice Recording Equalizer Banner */}
          {isListening && (
            <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 h-6">
                  <div className="soundwave-bar" />
                  <div className="soundwave-bar" />
                  <div className="soundwave-bar" />
                  <div className="soundwave-bar" />
                  <div className="soundwave-bar" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-700">Listening to voice dictation (en-IN)...</div>
                  <div className="text-[11px] text-red-500 font-mono">Recording: {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={stop}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Stop &amp; Transcribe
              </button>
            </div>
          )}

          {/* Feedback Textarea */}
          <div className="relative">
            <textarea
              id="feedback-text"
              className="input h-36 resize-none leading-relaxed text-sm"
              placeholder="Describe the campus facility issue clearly (e.g. broken switchboard, leaking pipe, faulty projector, air conditioner noise, wifi disconnection)..."
              value={form.text}
              onChange={(e) => setForm((f) => ({
                ...f,
                text: e.target.value,
                mode: f.mode === 'voice' && !isListening ? 'typed' : f.mode
              }))}
              aria-label="Feedback text"
            />
          </div>

          {/* Bottom Controls: Character Count and Voice Button */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    charPct > 90 ? 'bg-red-500' : charPct > 70 ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${charPct}%` }}
                />
              </div>
              <span className={`text-xs font-mono font-medium ${charCount < MIN_CHARS ? 'text-red-500' : 'text-slate-400'}`}>
                {charCount}/{MAX_CHARS} {charCount < MIN_CHARS ? `(min ${MIN_CHARS})` : 'chars'}
              </span>
            </div>

            {/* Voice Dictation Button */}
            {isSupported ? (
              <button
                type="button"
                onClick={isListening ? stop : start}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isListening
                    ? 'bg-red-600 text-white mic-pulse'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
                aria-label={isListening ? 'Stop recording voice' : 'Start voice dictation'}
              >
                <span className="text-base">{isListening ? '⏹' : '🎙️'}</span>
                <span>{isListening ? 'Stop Recording' : 'Voice Dictation (en-IN)'}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 cursor-not-allowed">
                🎙️ Speech recognition not supported in this browser
              </span>
            )}
          </div>

          {errors.text && <p className="text-red-600 text-xs mt-1">{errors.text}</p>}
        </div>

        {/* 3. Real-Time Live AI Pre-Analysis Assistant (Updates dynamically as student types) */}
        {liveAnalysis && (
          <div className="card bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                🧠 Real-Time AI Classification Assistant
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Live Prediction</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Predicted Route</div>
                <div className="font-bold text-slate-800 truncate" title={liveAnalysis.dept}>
                  {liveAnalysis.dept.replace(' and ', ' & ').replace(' Wing', '')}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Estimated Urgency</div>
                <div className="flex items-center gap-2">
                  <UrgencyBadge level={liveAnalysis.level} size="sm" />
                  <span className="font-mono text-slate-500 text-[11px]">~{(liveAnalysis.score * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border shadow-xs ${
                liveAnalysis.hazards.length > 0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <div className="text-[10px] uppercase font-bold mb-1">Hazard Radar</div>
                <div className="font-bold text-xs truncate">
                  {liveAnalysis.hazards.length > 0 ? (
                    <span className="flex items-center gap-1 text-red-700">
                      <span>⚠️</span> Hazard terms detected
                    </span>
                  ) : (
                    <span>✅ No immediate safety hazard</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || charCount < MIN_CHARS}
          className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-indigo-200"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Processing NLP Pipeline &amp; Generating Ticket…
            </span>
          ) : (
            '🚀 Submit Feedback & Dispatch Ticket'
          )}
        </button>
      </form>

      {/* Post-Submission Result Card */}
      {result && (
        <div className="card border-2 border-indigo-500 bg-gradient-to-br from-white via-indigo-50/20 to-white shadow-xl space-y-5 animate-in">
          
          <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
                <span>✅</span> Ticket Registered Successfully
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Facility Issue Ticket #{result.ticket.ticket_id}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <UrgencyBadge level={result.analysis.urgency_level} size="lg" />
              <button
                type="button"
                onClick={() => copyTicketId(result.ticket.ticket_id)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <span>{copied ? '✓' : '📋'}</span>
                <span>{copied ? 'Copied' : 'Copy Ticket #'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Assigned Maintenance Wing</div>
              <div className="font-bold text-slate-800 text-sm">{result.analysis.assigned_dept}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Urgency Score &amp; Polarity</div>
              <div className="font-mono text-slate-800 font-bold text-sm">
                {(result.analysis.urgency_score * 100).toFixed(0)}% (Pol: {result.analysis.sentiment_compound.toFixed(2)})
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Current Ticket Status</div>
              <div className="inline-flex items-center gap-1.5 font-bold text-amber-700 text-sm">
                <span>🕐</span> {result.ticket.status}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">Detected Problem Keyphrases (KeyBERT + TF-IDF):</div>
            <KeywordChips keywords={result.analysis.extracted_keywords} />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-slate-400">
              Cleaned Tokens: &ldquo;{result.analysis.cleaned_text}&rdquo;
            </span>
            <Link
              to="/my-submissions"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
            >
              <span>Track in My Submissions</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}
