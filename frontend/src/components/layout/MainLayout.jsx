import { useState } from "react";
import { Menu, Shield } from "lucide-react";
import Sidebar from "./Sidebar";
import FloatingSOSButton from "./FloatingSOSButton";

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/85 backdrop-blur-xl border-b border-white/70 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 brand-gradient rounded-xl flex items-center justify-center shadow-md">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="gradient-text font-extrabold text-sm">SafeTrail</span>
          </div>
          <button onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-800 p-1">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>

      <FloatingSOSButton />
    </div>
  );
}
