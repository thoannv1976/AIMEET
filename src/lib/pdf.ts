import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const REGULAR = path.join(FONTS_DIR, "DejaVuSans.ttf");
const BOLD = path.join(FONTS_DIR, "DejaVuSans-Bold.ttf");

let _regularBuf: Buffer | null = null;
let _boldBuf: Buffer | null = null;

function loadFonts(): { regular: Buffer | null; bold: Buffer | null } {
  if (_regularBuf === null && fs.existsSync(REGULAR)) _regularBuf = fs.readFileSync(REGULAR);
  if (_boldBuf === null && fs.existsSync(BOLD)) _boldBuf = fs.readFileSync(BOLD);
  return { regular: _regularBuf, bold: _boldBuf };
}

export async function markdownToPdf(markdown: string, title = "Báo cáo công việc"): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { regular, bold } = loadFonts();
      const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: title } });

      // Register Unicode-capable fonts so Vietnamese diacritics render correctly.
      // Falls back to the built-in PDF Helvetica if the TTFs are missing.
      if (regular) doc.registerFont("body", regular);
      if (bold) doc.registerFont("body-bold", bold);
      const FONT_BODY = regular ? "body" : "Helvetica";
      const FONT_BOLD = bold ? "body-bold" : "Helvetica-Bold";

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.font(FONT_BOLD).fontSize(20).text(title, { align: "center" });
      doc.moveDown(0.3);
      doc
        .font(FONT_BODY)
        .fontSize(10)
        .fillColor("#64748b")
        .text(`Tạo lúc ${new Date().toLocaleString("vi-VN")}`, { align: "center" })
        .fillColor("#0f172a");
      doc.moveDown(1);
      doc.font(FONT_BODY).fontSize(11);

      for (const raw of markdown.split(/\r?\n/)) {
        const line = raw.trimEnd();
        if (!line.trim()) {
          doc.moveDown(0.5);
          continue;
        }
        let m;
        if ((m = line.match(/^#\s+(.*)/))) {
          doc.moveDown(0.5).font(FONT_BOLD).fontSize(16).text(stripMd(m[1])).font(FONT_BODY).fontSize(11);
        } else if ((m = line.match(/^##\s+(.*)/))) {
          doc.moveDown(0.4).font(FONT_BOLD).fontSize(14).text(stripMd(m[1])).font(FONT_BODY).fontSize(11);
        } else if ((m = line.match(/^###\s+(.*)/))) {
          doc.moveDown(0.3).font(FONT_BOLD).fontSize(12).text(stripMd(m[1])).font(FONT_BODY).fontSize(11);
        } else if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
          doc.text(`• ${stripMd(m[1])}`, { indent: 12 });
        } else if ((m = line.match(/^\s*(\d+)\.\s+(.*)/))) {
          doc.text(`${m[1]}. ${stripMd(m[2])}`, { indent: 12 });
        } else {
          doc.text(stripMd(line));
        }
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function stripMd(s: string): string {
  return s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
}
