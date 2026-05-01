"use client";
import { useEffect, useState } from "react";

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/reports/${params.id}`);
      if (r.ok) setReport(await r.json());
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <p>Đang tải...</p>;
  if (!report) return <p>Không tìm thấy.</p>;

  return (
    <div className="space-y-4">
      <a href="/reports" className="text-sm text-brand-600 hover:underline">
        ← Tất cả báo cáo
      </a>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <div className="text-xs text-slate-500">
            {new Date(report.createdAt).toLocaleString("vi-VN")} · {report.periodLabel || "—"}
          </div>
        </div>
        <div className="flex gap-2">
          <a className="btn-primary" href={`/api/reports/${report.id}/download?format=docx`}>
            ⬇ DOCX
          </a>
          <a className="btn-primary" href={`/api/reports/${report.id}/download?format=pdf`}>
            ⬇ PDF
          </a>
          <a className="btn-secondary" href={`/api/reports/${report.id}/download?format=md`}>
            ⬇ MD
          </a>
        </div>
      </div>
      <article className="card p-6 prose max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{report.content}</pre>
      </article>
    </div>
  );
}
