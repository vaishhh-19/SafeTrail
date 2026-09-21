import { Shield, AlertTriangle, AlertOctagon } from "lucide-react";

const config = {
  safe: {
    label: "Safe",
    color: "text-safe",
    bg:    "bg-green-100",
    border:"border-green-200",
    icon:  Shield,
    pulse: false,
  },
  moderate: {
    label: "Moderate Risk",
    color: "text-moderate",
    bg:    "bg-orange-100",
    border:"border-orange-200",
    icon:  AlertTriangle,
    pulse: true,
  },
  danger: {
    label: "DANGER",
    color: "text-danger",
    bg:    "bg-red-100",
    border:"border-red-200",
    icon:  AlertOctagon,
    pulse: true,
  },
};

export default function RiskBadge({ level = "safe", size = "md" }) {
  const c = config[level] || config.safe;
  const Icon = c.icon;

  const sizes = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-lg px-5 py-3",
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border font-semibold
      ${c.bg} ${c.border} ${c.color} ${sizes[size]}
      ${c.pulse ? "animate-pulse" : ""}`}>
      <Icon className={size === "lg" ? "w-6 h-6" : "w-4 h-4"} />
      {c.label}
    </div>
  );
}