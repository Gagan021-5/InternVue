export default function AiScoreBar({ score = 0, label = "AI Authenticity Score" }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));

  const getColor = () => {
    if (clamped >= 75) return "from-emerald-500 to-green-600";
    if (clamped >= 45) return "from-amber-500 to-orange-500";
    return "from-red-500 to-rose-600";
  };

  return (
    <div className="section-shell p-3">
      <div className="text-muted mb-2 flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono">{clamped}/100</span>
      </div>
      <div className="surface-soft h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
