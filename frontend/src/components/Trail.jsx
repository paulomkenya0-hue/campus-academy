// The Trail: Campus Academy's signature visual — stages shown as waypoints
// along a journey, not a generic progress bar. Locked / current / done states
// read at a glance, and the connecting line fills as XP-worthy ground is covered.
export function Trail({ stages, unlockedStageIds, completedStageIds, onSelect }) {
  return (
    <div className="relative pl-2">
      {stages.map((stage, i) => {
        const isDone = completedStageIds.has(stage.id);
        const isUnlocked = unlockedStageIds.has(stage.id);
        const isLast = i === stages.length - 1;

        return (
          <div key={stage.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <div
                className={`absolute left-[15px] top-8 w-0.5 h-full ${
                  isDone ? "bg-teal" : "bg-night-border"
                }`}
              />
            )}
            <button
              disabled={!isUnlocked}
              onClick={() => onSelect(stage)}
              className={`relative z-10 shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center
                font-mono text-xs font-bold transition-colors
                ${isDone ? "bg-teal border-teal text-night" : ""}
                ${isUnlocked && !isDone ? "bg-amber border-amber text-night" : ""}
                ${!isUnlocked ? "bg-night-raised border-night-border text-ivory-muted cursor-not-allowed" : "cursor-pointer"}
              `}
              title={stage.title}
            >
              {isDone ? "✓" : isUnlocked ? i + 1 : "🔒"}
            </button>
            <button
              disabled={!isUnlocked}
              onClick={() => onSelect(stage)}
              className={`text-left ${!isUnlocked ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <p className="font-display font-bold">{stage.title}</p>
              <p className="text-sm text-ivory-muted">
                {isDone ? "Imekamilika" : isUnlocked ? "Inapatikana" : `Kamilisha stage iliyopita kwanza`}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}
