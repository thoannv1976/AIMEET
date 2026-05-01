import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIMEET - AI Meeting & Task Manager",
  description: "Ghi âm cuộc họp, chuyển văn bản, trích xuất công việc & báo cáo bằng AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <div className="font-bold text-slate-900">AIMEET</div>
                <div className="text-xs text-slate-500">AI Meeting & Task Manager</div>
              </div>
            </div>
            <nav className="text-sm text-slate-600">
              <a href="/" className="hover:text-brand-600 px-2">Bảng điều khiển</a>
              <a href="/meetings" className="hover:text-brand-600 px-2">Cuộc họp</a>
              <a href="/tasks" className="hover:text-brand-600 px-2">Công việc</a>
              <a href="/reports" className="hover:text-brand-600 px-2">Báo cáo</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-6 text-xs text-slate-500">
          © {new Date().getFullYear()} AIMEET — Hosted on Google Cloud · Firestore
        </footer>
      </body>
    </html>
  );
}
