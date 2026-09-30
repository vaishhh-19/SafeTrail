import { Stethoscope, Flame, ShieldAlert, HandHelping, Car, CircleAlert } from "lucide-react";

export const SOS_TYPES = [
  {
    key: "medical",
    label: "Medical",
    icon: Stethoscope,
    activeGradient: "from-rose-500 to-red-600",
    border: "border-rose-400",
    glow: "shadow-rose-500/30",
    iconColor: "text-rose-500",
  },
  {
    key: "fire",
    label: "Fire",
    icon: Flame,
    activeGradient: "from-orange-500 to-amber-600",
    border: "border-orange-400",
    glow: "shadow-orange-500/30",
    iconColor: "text-orange-500",
  },
  {
    key: "crime",
    label: "Crime",
    icon: ShieldAlert,
    activeGradient: "from-red-600 to-rose-700",
    border: "border-red-500",
    glow: "shadow-red-600/30",
    iconColor: "text-red-600",
  },
  {
    key: "harassment",
    label: "Harassment",
    icon: HandHelping,
    activeGradient: "from-purple-600 to-pink-600",
    border: "border-purple-400",
    glow: "shadow-purple-500/30",
    iconColor: "text-purple-600",
  },
  {
    key: "accident",
    label: "Accident",
    icon: Car,
    activeGradient: "from-amber-500 to-yellow-600",
    border: "border-amber-400",
    glow: "shadow-amber-500/30",
    iconColor: "text-amber-500",
  },
  {
    key: "other",
    label: "Other Alert",
    icon: CircleAlert,
    activeGradient: "from-indigo-600 to-blue-600",
    border: "border-indigo-400",
    glow: "shadow-indigo-500/30",
    iconColor: "text-indigo-600",
  },
];

export default function SOSTypePicker({ value, onChange, size = "md" }) {
  const pad = size === "sm" ? "p-2.5" : "p-3.5";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {SOS_TYPES.map(({ key, label, icon: Icon, activeGradient, border, glow, iconColor }) => {
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex flex-col items-center justify-center gap-1.5 ${pad} rounded-2xl border-2 transition-all duration-200 ${
              isSelected
                ? `bg-gradient-to-br ${activeGradient} text-white ${border} shadow-lg ${glow} scale-[1.03]`
                : "bg-white/90 border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.01]"
            }`}
          >
            <Icon className={`${iconSize} ${isSelected ? "text-white animate-bounce" : iconColor}`} />
            <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-700"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
