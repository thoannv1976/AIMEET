import "./globals.css";
import type { Metadata, Viewport } from "next";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "AIMEET - AI Meeting & Task Manager",
  description: "Ghi âm cuộc họp, chuyển văn bản, trích xuất công việc & báo cáo bằng AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "AIMEET",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon-192.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen overscroll-none">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold shrink-0">
                A
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 leading-tight">AIMEET</div>
                <div className="text-[11px] text-slate-500 leading-tight truncate">
                  AI Meeting & Task Manager
                </div>
              </div>
            </a>
            <div className="flex-1" />
            <nav className="hidden md:flex text-sm text-slate-600">
              <a href="/" className="hover:text-brand-600 px-3 py-2">Bảng điều khiển</a>
              <a href="/meetings" className="hover:text-brand-600 px-3 py-2">Cuộc họp</a>
              <a href="/tasks" className="hover:text-brand-600 px-3 py-2">Công việc</a>
              <a href="/reports" className="hover:text-brand-600 px-3 py-2">Báo cáo</a>
            </nav>
            <MobileNav />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-4 md:py-6 pb-24 md:pb-6">{children}</main>
        <BottomNav />
        <footer className="hidden md:block max-w-6xl mx-auto px-4 py-6 text-xs text-slate-500">
          © {new Date().getFullYear()} AIMEET — Hosted on Google Cloud · Firestore
        </footer>
      </body>
    </html>
  );
}

function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-4 text-[11px] pb-[env(safe-area-inset-bottom)]">
      <a href="/" className="flex flex-col items-center justify-center py-2 text-slate-700 hover:text-brand-600">
        <span className="text-lg leading-none">🏠</span>
        <span className="mt-0.5">Trang chủ</span>
      </a>
      <a href="/meetings" className="flex flex-col items-center justify-center py-2 text-slate-700 hover:text-brand-600">
        <span className="text-lg leading-none">🎙️</span>
        <span className="mt-0.5">Cuộc họp</span>
      </a>
      <a href="/tasks" className="flex flex-col items-center justify-center py-2 text-slate-700 hover:text-brand-600">
        <span className="text-lg leading-none">✅</span>
        <span className="mt-0.5">Công việc</span>
      </a>
      <a href="/reports" className="flex flex-col items-center justify-center py-2 text-slate-700 hover:text-brand-600">
        <span className="text-lg leading-none">📊</span>
        <span className="mt-0.5">Báo cáo</span>
      </a>
    </nav>
  );
}
