export function XpBadge({ level, xp, nextLevelXp }) {
  const pct = nextLevelXp ? Math.min(100, Math.round((xp / nextLevelXp) * 100)) : 100;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display font-bold text-amber">LEVEL {level}</span>
        <span className="font-mono text-sm text-ivory-muted">
          {xp} XP{nextLevelXp ? ` / ${nextLevelXp}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-night-raised overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber to-teal transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StreakBadge({ current, longest }) {
  return (
    <div className="card flex items-center gap-3">
      <span className="text-2xl">🔥</span>
      <div>
        <p className="font-display font-bold">{current} siku mfululizo</p>
        <p className="text-sm text-ivory-muted">Rekodi: {longest} siku</p>
      </div>
    </div>
  );
}
