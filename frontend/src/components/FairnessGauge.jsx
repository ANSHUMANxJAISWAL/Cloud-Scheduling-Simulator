import React from 'react';

export default function FairnessGauge({ fairnessReport }) {
  if (!fairnessReport) return null;

  const { jains_index, cv_waiting } = fairnessReport;

  // Arc math: semi-circle path of radius 50
  // Path starts at (10, 60) and arcs to (110, 60)
  // Total arc length is pi * R = pi * 50 = 157.08
  const strokeLength = 157.08;
  const dashOffset = strokeLength - (strokeLength * jains_index);

  // Rotation of the needle: J ranges from 0 to 1 -> maps to -90 to +90 degrees
  const angle = (jains_index * 180) - 90;

  // Determine status badge
  let status = "Unfair";
  let statusColor = "text-danger bg-danger/10 border-danger/20";
  if (jains_index >= 0.9) {
    status = "Highly Fair";
    statusColor = "text-success bg-success/10 border-success/20";
  } else if (jains_index >= 0.75) {
    status = "Fair";
    statusColor = "text-accent bg-accent/10 border-accent/20";
  } else if (jains_index >= 0.5) {
    status = "Moderately Fair";
    statusColor = "text-warning bg-warning/10 border-warning/20";
  }

  return (
    <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col items-center justify-between h-full space-y-4">
      <div className="w-full text-left">
        <h3 className="font-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-300">
          Fairness Scorecard
        </h3>
        <p className="text-xs text-textSecondary font-mono mt-1">
          Jain's Fairness Index relative to CPU time sharing.
        </p>
      </div>

      {/* SVG Semi-Circular Gauge */}
      <div className="relative flex items-center justify-center h-32 w-48 mt-2">
        <svg width="180" height="110" viewBox="0 0 120 70">
          <defs>
            {/* Red to Yellow to Green Gradient for the Arc */}
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#1f2937"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Progress Colored Arc */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="url(#gauge-gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeLength}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />

          {/* Center Point */}
          <circle cx="60" cy="60" r="4" fill="#f9fafb" />

          {/* Rotated Needle */}
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="20"
            stroke="#f9fafb"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform={`rotate(${angle}, 60, 60)`}
            className="transition-transform duration-700 ease-out"
          />
        </svg>

        {/* Floating Metrics Overlay */}
        <div className="absolute bottom-1 text-center font-mono">
          <span className="text-2xl font-bold text-textPrimary tracking-tight">
            {jains_index.toFixed(3)}
          </span>
          <p className="text-[9px] uppercase tracking-wider text-textSecondary">Jain's Index</p>
        </div>
      </div>

      {/* Info Stats */}
      <div className="w-full flex items-center justify-between border-t border-border/60 pt-4 font-mono text-xs">
        <div className="flex flex-col text-left">
          <span className="text-[10px] text-textSecondary">COEFF. OF VARIATION (CV)</span>
          <span className="text-textPrimary font-semibold">{cv_waiting.toFixed(3)}</span>
        </div>

        <div className="flex flex-col text-right items-end">
          <span className="text-[10px] text-textSecondary mb-0.5">HEALTH STATUS</span>
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${statusColor}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
