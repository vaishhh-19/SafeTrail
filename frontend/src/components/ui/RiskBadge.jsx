import { Shield, AlertTriangle, AlertOctagon } from "lucide-react";

const config = {
  safe: {
    label: "Safe Zone",
    color: "text-emerald-700",
    bg:    "bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/25",
    border:"border-emerald-300/80",
    shadow:"shadow-sm shadow-emerald-500/20",
    dot:   "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    icon:  Shield,
    pulse: false,
  },
  moderate: {
    label: "Moderate Risk",
    color: "text-amber-800",
    bg:    "bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/25",
    border:"border-amber-300/80",
    shadow:"shadow-md shadow-amber-500/25",
    dot:   "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-ping",
    icon:  AlertTriangle,
    pulse: true,
  },
  danger: {
    label: "HIGH DANGER",
    color: "text-rose-700",
    bg:    "bg-gradient-to-r from-rose-500/20 via-red-500/20 to-pink-500/25",
    border:"border-rose-400/80",
    shadow:"shadow-lg shadow-rose-500/35 ring-2 ring-rose-400/30",
    dot:   "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-ping",
    icon:  AlertOctagon,
    pulse: true,
  },
};

export default function RiskBadge({ level = "safe", size = "md" }) {
  const c = config[level] || config.safe;
  const Icon = c.icon;

  const sizes = {
    sm: "text-xs px-2.5 py-1",
    md: "text-sm px-3.5 py-1.5",
    lg: "text-base sm:text-lg px-5 py-2.5",
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full border backdrop-blur-md font-bold tracking-tight transition-all duration-300
      ${c.bg} ${c.border} ${c.color} ${c.shadow} ${sizes[size]}
      ${c.pulse ? "animate-pulse" : ""}`}
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${c.dot}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot.split(" ")[0]}`} />
      </span>
      <Icon className={size === "lg" ? "w-5 h-5 sm:w-6 sm:h-6" : size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      <span>{c.label}</span>
    </div>
  );
}