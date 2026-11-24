export default function KeywordChips({ keywords = [] }) {
  if (!keywords.length) return <span className="text-slate-400 text-sm">No keywords detected</span>
  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw, i) => (
        <span
          key={i}
          className="inline-flex items-center bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-100"
        >
          {kw}
        </span>
      ))}
    </div>
  )
}
