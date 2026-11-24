export default function Skeleton({ className = '', lines = 1 }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="skeleton h-5 w-1/3 mb-4" />
      <div className="skeleton h-8 w-1/2 mb-2" />
      <div className="skeleton h-4 w-2/3" />
    </div>
  )
}
