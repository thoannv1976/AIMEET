# Hướng dẫn các bước tiếp theo

Tài liệu này dành cho người vừa clone repo AIMEET về và muốn đưa ứng dụng vào sử dụng. Mỗi bước có thể đánh dấu hoàn thành lần lượt.

## Bước 1 — Chuẩn bị môi trường

- [ ] Cài Node.js >= 20 (`node -v` để kiểm tra).
- [ ] Cài [Firebase CLI](https://firebase.google.com/docs/cli) và [gcloud CLI](https://cloud.google.com/sdk/docs/install).
- [ ] Đăng nhập Google Cloud:
  ```bash
  gcloud auth login
  gcloud config set project YOUR_PROJECT_ID
  gcloud auth application-default login
  ```

## Bước 2 — Tạo project Firebase

- [ ] Truy cập [Firebase Console](https://console.firebase.google.com/) → **Add project**.
- [ ] Bật **Firestore Database** ở chế độ **Native**, chọn region `asia-southeast1`.
- [ ] Vào **Project settings → Service accounts** → **Generate new private key** → tải file JSON về (đặt cạnh repo, đừng commit).

## Bước 3 — Cấu hình biến môi trường

```bash
cp .env.example .env.local
```

Điền 3 biến:

| Biến | Lấy ở đâu |
| --- | --- |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |
| `FIREBASE_PROJECT_ID` | Project ID trong Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Dán nội dung file JSON ở Bước 2 thành **một dòng** (dùng `jq -c . < service-account.json`) |

Nếu đang chạy local và đã `gcloud auth application-default login`, có thể bỏ `FIREBASE_SERVICE_ACCOUNT_JSON`.

## Bước 4 — Chạy thử ở local

```bash
npm install
npm run dev
```

- [ ] Mở http://localhost:3000 → cấp quyền microphone.
- [ ] Bấm **Bắt đầu ghi** → nói thử vài câu giao việc → bấm **Dừng**.
- [ ] Kiểm tra ở `/meetings` đã có meeting mới và `/tasks` có công việc do AI trích xuất.

## Bước 5 — Triển khai Firestore rules

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```

Rules mặc định chặn toàn bộ truy cập client — chỉ Admin SDK qua API mới ghi được.

## Bước 6 — Triển khai lên Cloud Run

```bash
# Tạo Artifact Registry repo (1 lần)
gcloud artifacts repositories create aimeet \
  --repository-format=docker --location=asia-southeast1

# Tạo secret cho Anthropic key
echo -n "$ANTHROPIC_API_KEY" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-

# Cấp quyền Firestore cho service account mặc định
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$(gcloud iam service-accounts list \
     --filter='displayName:Default compute service account' --format='value(email)')" \
  --role="roles/datastore.user"

# Build & deploy
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SERVICE=aimeet,_REGION=asia-southeast1
```

Sau khi deploy xong, ghi lại URL Cloud Run trả về.

## Bước 7 — Bật nhắc việc định kỳ (tuỳ chọn)

```bash
gcloud scheduler jobs create http aimeet-reminders \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR-CLOUD-RUN-URL/api/reminders?ack=1" \
  --http-method=GET
```

Frontend cũng tự poll `/api/reminders` mỗi 60 giây để hiển thị banner nhắc.

## Bước 8 — Bảo mật trước khi public

- [ ] Đặt Cloud Run service ở chế độ **Require authentication** rồi gắn IAP, hoặc thêm Firebase Auth ở tầng app.
- [ ] Kiểm tra `.gitignore` đã chứa `.env.local`, `*.json` service account.
- [ ] Bật log audit Firestore nếu xử lý dữ liệu nhạy cảm.

## Bước 9 — Mở rộng tiếp theo

Tham khảo phần **Roadmap** trong `README.md`. Một số việc nên làm sớm:

1. Thêm Firebase Auth (Google sign-in) và phân quyền per-user trong `firestore.rules`.
2. Thay Web Speech API bằng Google Cloud Speech-to-Text cho audio dài / nhiều người nói.
3. Tích hợp gửi email/Slack khi tới `reminderAt` thay vì chỉ banner UI.
4. Thêm test (Vitest + Playwright) cho luồng tạo meeting → trích xuất task → sinh báo cáo.

## Khi gặp vấn đề

| Triệu chứng | Hướng xử lý |
| --- | --- |
| `PERMISSION_DENIED` khi gọi API | Service account thiếu role `roles/datastore.user` |
| AI không trích xuất được task | Kiểm tra `ANTHROPIC_API_KEY` và quota tại console.anthropic.com |
| Trình duyệt không ghi âm được | Cần HTTPS hoặc `localhost`; Safari hỗ trợ hạn chế Web Speech API |
| Build Cloud Run lỗi `next: not found` | Kiểm tra `Dockerfile` đang dùng `npm ci` và copy `node_modules` đúng stage |
