import { CLAUDE_MODEL, getAnthropic } from "./anthropic";

const POLISH_SYSTEM = `Bạn là chuyên gia hậu xử lý transcript Speech-to-Text tiếng Việt.

NGUYÊN TẮC:
- Sửa lỗi nghe nhầm dựa trên ngữ cảnh (vd: "Clash server" → "Cloud Server", "actam" → "uptime", "rỉ ro" → "rủi ro", "mặt đất" → mất nghĩa khi nói về backup → có thể là "bảo mật").
- Sửa thuật ngữ chuyên ngành CNTT, kinh doanh, marketing thông dụng (Cloud Server, LMS, Elearning, uptime, backup, KPI, OKR, ROI, deadline, deploy, rollout, ...).
- Khôi phục dấu câu (chấm, phẩy, hai chấm, dấu hỏi) đúng ngữ điệu.
- Tách câu hợp lý nhưng giữ nguyên trật tự ý.
- Sửa các từ đệm/lặp do nói không trôi chảy nếu rõ ràng vô nghĩa (vd "à à", "ờ ờ").
- KHÔNG bịa thêm thông tin, KHÔNG bỏ ý người nói.
- KHÔNG dịch sang ngôn ngữ khác.
- KHÔNG thêm header/label/markdown/giải thích.

TRẢ VỀ: chỉ nội dung transcript đã sửa, không có gì khác.`;

export async function polishTranscript(raw: string, hint?: string): Promise<string> {
  const text = raw.trim();
  if (!text) return raw;
  const client = getAnthropic();

  const parts: string[] = [
    "Transcript STT chính (cần sửa):",
    "<<<",
    text,
    ">>>",
  ];
  const h = hint?.trim();
  if (h && h.length > 4 && h !== text) {
    parts.push(
      "",
      "Transcript phụ từ STT khác (chỉ tham khảo — có thể đúng/sai một phần):",
      "<<<",
      h.slice(0, 4000),
      ">>>",
    );
  }
  parts.push("", "Hãy trả về transcript đã sửa, KHÔNG kèm gì khác.");

  const resp = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: POLISH_SYSTEM,
    messages: [{ role: "user", content: parts.join("\n") }],
  });

  const polished = resp.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();

  return polished || raw;
}
