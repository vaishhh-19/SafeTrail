import { Stethoscope, Flame, ShieldAlert, HandHelping, Car, CircleAlert } from "lucide-react";

export const SOS_TYPES = [
  { key: "medical",    label: "Medical",    icon: Stethoscope, color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200"    },
  { key: "fire",       label: "Fire",       icon: Flame,       color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "crime",      label: "Crime",      icon: ShieldAlert, color: "text-slate-700",  bg: "bg-slate-100", border: "border-slate-300"  },
  { key: "harassment", label: "Harassment", icon: HandHelping, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "accident",   label: "Accident",   icon: Car,         color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200"  },
  { key: "other",      label: "Other",      icon: CircleAlert, color: "text-brand-600",  bg: "bg-brand-50",  border: "border-brand-200"  },
];

export default function SOSTypePicker({ value, onChange, size = "md" }) {
  const pad = size === "sm" ? "p-3" : "p-4";
  const iconSize = size === "sm" ? "w-5 h-5" : "w-6 h-6";

  return (
    <div className="grid grid-cols-3 gap-2">
      {SOS_TYPES.map(({ key, label, icon: Icon, color, bg, border }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex flex-col items-center gap-1.5 ${pad} rounded-xl border-2 transition ${
            value === key
              ? `${bg} ${border} scale-[1.03] shadow-soft`
              : "bg-white border-slate-100 hover:border-slate-200"
          }`}
        >
          <Icon className={`${iconSize} ${value === key ? color : "text-slate-400"}`} />
          <span className={`text-xs font-medium ${value === key ? color : "text-slate-500"}`}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
