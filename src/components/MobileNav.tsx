"use client";
import { useEffect, useState } from "react";

const LINKS: [string, string, string][] = [
  ["/", "🏠", "Bảng điều khiển"],
  ["/meetings", "🎙️", "Cuộc họp"],
  ["/tasks", "✅", "Công việc"],
  ["/reports", "📊", "Báo cáo"],
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Mở menu"
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-300 text-slate-700 active:bg-slate-100"
        onClick={() => setOpen(true)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <strong className="text-slate-900">Menu</strong>
              <button
                type="button"
                aria-label="Đóng"
                className="w-9 h-9 rounded-md hover:bg-slate-100 text-slate-600 text-xl"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 overflow-auto p-2">
              {LINKS.map(([href, icon, label]) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-slate-800 hover:bg-slate-50 active:bg-slate-100"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium">{label}</span>
                </a>
              ))}
            </nav>
            <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500">
              © {new Date().getFullYear()} AIMEET
            </div>
          </div>
        </div>
      )}
    </>
  );
}
