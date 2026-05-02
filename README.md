# AIMEET — AI Meeting & Task Manager

Ứng dụng web giúp:

- 🎙️ **Ghi âm cuộc họp** trực tiếp trên trình duyệt (Web Speech API).
- 📝 **Chuyển giọng nói thành văn bản (transcript)** theo thời gian thực.
- 🪄 **AI trích xuất công việc** (action items) từ transcript bằng Anthropic Claude.
- ✅ **Quản lý công việc**: tạo, sửa, xoá, cập nhật trạng thái, % tiến độ.
- ⏰ **Nhắc việc** & cảnh báo công việc quá hạn.
- 📊 **AI tổng hợp báo cáo công việc** đa kỳ (tuần, tháng, dự án...).
- 💾 **Lưu trữ trên Firebase Firestore**.
- ⬇️ **Xuất báo cáo `.docx`, `.pdf`, `.md`**.

Stack: **Next.js 14 (App Router) · TypeScript · TailwindCSS · Firebase Admin · Anthropic Claude · pdfkit · docx**.

> 👉 Mới clone về? Xem [`NEXT_STEPS.md`](./NEXT_STEPS.md) để có hướng dẫn từng bước đưa ứng dụng lên chạy.

---

## 1. Cấu trúc thư mục

```
src/
├── app/
│   ├── api/                  # API routes (Node.js runtime)
│   │   ├── meetings/         # POST: tạo meeting + AI extract tasks
│   │   ├── tasks/            # CRUD công việc
│   │   ├── reports/          # AI generate + lưu báo cáo, download docx/pdf
│   │   ├── reminders/        # Polling endpoint nhắc việc
│   │   └── transcribe/       # (placeholder cho server-side STT)
│   ├── meetings/             # UI danh sách + chi tiết cuộc họp
│   ├── tasks/                # UI quản lý công việc
│   ├── reports/              # UI báo cáo
│   ├── layout.tsx            # Header chung
│   └── page.tsx              # Dashboard + recorder
├── components/
│   ├── Recorder.tsx          # Web Speech API recorder
│   ├── TaskItem.tsx          # 1 dòng công việc, có inline edit
│   └── ReminderBanner.tsx    # Banner nhắc việc (poll mỗi 60s)
└── lib/
    ├── firebase.ts           # Admin SDK init
    ├── anthropic.ts          # Gọi Claude (extract + report)
    ├── docx.ts               # Markdown → DOCX
    ├── pdf.ts                # Markdown → PDF
    └── types.ts
```

## 2. Yêu cầu hệ thống

- Node.js >= 20
- Tài khoản Google Cloud + dự án Firebase (Firestore Native mode)
- Anthropic API key

## 3. Cài đặt local

```bash
npm install
cp .env.example .env.local
# điền ANTHROPIC_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_JSON
npm run dev
# → http://localhost:3000
```

> **Mẹo**: nếu dùng `gcloud auth application-default login` thì không cần `FIREBASE_SERVICE_ACCOUNT_JSON`.

## 4. Cấu hình Firebase

1. Tạo project Firebase, bật **Firestore Native**.
2. Tạo **Service Account** → tải JSON → đặt làm biến môi trường `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON một dòng) hoặc dùng ADC trên Cloud Run/App Engine.
3. Triển khai rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

Cấu trúc collection (tự sinh):

- `meetings/{id}`: `{ title, date, transcript, summary, taskIds[], createdAt }`
- `tasks/{id}`: `{ title, description, assignee, dueDate, priority, status, progress, meetingId, reminderAt, reminded, createdAt, updatedAt }`
- `reports/{id}`: `{ title, periodLabel, content (markdown), taskIds[], meetingIds[], createdAt }`

## 5. Deploy lên Google Cloud

### Cách A: Cloud Run (khuyến nghị)

```bash
# 1) tạo Artifact Registry repo (1 lần)
gcloud artifacts repositories create aimeet \
  --repository-format=docker --location=asia-southeast1

# 2) tạo secret
echo -n "$ANTHROPIC_API_KEY" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-

# 3) cấp quyền cho Cloud Run service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$(gcloud iam service-accounts list \
     --filter='displayName:Default compute service account' --format='value(email)')" \
  --role="roles/datastore.user"

# 4) build & deploy
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SERVICE=aimeet,_REGION=asia-southeast1
```

### Cách B: App Engine

```bash
gcloud app deploy app.yaml
```

Đảm bảo cấp role **`roles/datastore.user`** cho service account App Engine để Admin SDK đọc/ghi Firestore.

## 6. Nhắc việc tự động (Cloud Scheduler tuỳ chọn)

Endpoint `GET /api/reminders?ack=1` đánh dấu các công việc đã được nhắc.
Bạn có thể tạo Cloud Scheduler chạy mỗi 5 phút để gửi email/Slack:

```bash
gcloud scheduler jobs create http aimeet-reminders \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR-CLOUD-RUN-URL/api/reminders?ack=1" \
  --http-method=GET
```

(Frontend cũng tự poll endpoint này mỗi 60s để hiển thị banner nhắc việc.)

## 7. Bảo mật

- Firestore rules mặc định **deny tất cả truy cập client**, chỉ Admin SDK qua API mới ghi được.
- Nên gắn thêm IAP / Firebase Auth trước khi public.
- Không commit `.env.local` hay `serviceAccount.json`.

## 8. Roadmap gợi ý

- [ ] Đăng nhập Google (Firebase Auth) + phân quyền per-user
- [ ] Server-side STT bằng Google Cloud Speech-to-Text cho file audio dài
- [ ] Tích hợp gửi email nhắc qua SendGrid / Pub/Sub
- [ ] Realtime sync bằng Firestore Web SDK
- [ ] Multi-tenant (organization)

---

Made with ❤ + Claude Sonnet 4.6.
