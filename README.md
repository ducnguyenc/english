# English 5 Days — Web học tiếng Anh theo hộp Leitner

Web app học từ vựng & cấu trúc câu tiếng Anh, dùng **hệ thống ôn tập Leitner 5 tầng**:
mỗi từ bắt đầu ở Day 1, trả lời **đúng 1 lần** thì lên tầng kế tiếp, **sai** thì ở lại tầng hiện tại.
Đúng ở Day 5 → vào kho **Đã thuộc**.

Dữ liệu (nội dung + tiến độ học) lưu trong **MySQL**, không còn dùng localStorage.

## Chạy thử

1. Cấu hình kết nối DB trong `.env` (đã có sẵn giá trị mẫu):

   ```
   DB_HOST=127.0.0.1
   DB_PORT=3322
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=laravel
   PORT=4000
   VITE_API_URL=http://localhost:4000
   ```

   Lưu ý: `DB_HOST` phải là địa chỉ phân giải được từ máy đang chạy Node (ví dụ `127.0.0.1`
   nếu MySQL expose port ra host) — hostname kiểu `laravel` chỉ dùng được nếu Node cũng chạy
   trong cùng Docker network với MySQL. `DB_NAME` là **tên database**, khác với `DB_HOST`.

2. Cài dependency (frontend + backend chung 1 `package.json`):

   ```bash
   npm install
   ```

3. Tạo bảng trong database `laravel` (chỉ cần chạy 1 lần, database phải đã tồn tại sẵn):

   ```bash
   npm run db:migrate
   ```

4. Chạy cả frontend (Vite) và backend (Express API) cùng lúc:

   ```bash
   npm run dev
   ```

   Mở `http://localhost:5173` (frontend gọi API tại `http://localhost:4000`).
   Lần đầu chạy, server tự **seed** vài mục mẫu vào `content_items` nếu bảng đang rỗng.

   Muốn chạy riêng backend: `npm run server`.

## Cách hoạt động

### Luật Leitner (xem `src/lib/leitner.ts`)

```
Day 1 -(đúng)-> Day 2 -(đúng)-> Day 3 -(đúng)-> Day 4 -(đúng)-> Day 5 -(đúng)-> ✅ Đã thuộc
  ▲ sai: ở lại    ▲ sai: ở lại    ▲ sai: ở lại    ▲ sai: ở lại    ▲ sai: ở lại       │
                                                                    sai ở kho ──────┘ (rớt về Day 5)
```

- Từ nào sai **≥ 3 lần** được gắn nhãn **🔥 Từ khó**, ưu tiên xuất hiện đầu hàng đợi ôn,
  có tab riêng "Từ khó" để luyện tập trung.
- Trong 1 lượt ôn, từ trả lời sai bị đẩy xuống cuối hàng đợi, chỉ gặp lại **tối đa 1 lần** trong lượt đó
  (không lặp vô hạn cho tới khi đúng).

### Quiz: chỉ gõ từ (không có trắc nghiệm chọn đáp án)

Quiz có 2 dạng bài, cả 2 đều yêu cầu **gõ tự do**, không có multiple-choice:

| Dạng | Mô tả |
|---|---|
| Điền từ | Hiện gợi ý (English hoặc tiếng Việt tuỳ tầng) → gõ đáp án |
| Nghe & gõ lại | Nghe phát âm → gõ lại **English** |

### Chiều câu hỏi theo tầng (dạng "Điền từ")

| Tầng | Chiều hỏi |
|---|---|
| Day 1 | Hiện **English** → gõ **tiếng Việt** |
| Day 2 | Hiện **tiếng Việt** → gõ **English** |
| Day 3–5, Đã thuộc | **Random** mỗi câu |

Riêng dạng "Nghe & gõ lại": đáp án luôn là **English** dù nghe chiều nào.

Chấm điểm gõ tự do: không phân biệt hoa/thường, bỏ dấu câu thừa. Nếu từ có nhiều nghĩa
(phân tách bằng `;` trong field `vietnamese`), đúng 1 trong các nghĩa là được.

## Thêm nội dung (từ vựng / cấu trúc câu)

Vào trang **`/admin`**:
- Điền form (English, IPA, tiếng Việt, ví dụ, ảnh...) → **Thêm mới**.
- Ảnh nhận 3 dạng: emoji (`🙏`), URL, hoặc **upload file** (tự resize + convert base64).
- **Export JSON** để backup, hoặc dùng khi cần chuyển dữ liệu sang máy khác.
- **Import JSON** (từ file hoặc dán trực tiếp) — **thêm mới**, đè theo `id` nếu trùng (không xoá nội dung đang có).
- **Tải file mẫu** để biết đúng định dạng JSON cần khi tự soạn file import.
- Từ mới luôn bắt đầu ở **Day 1**.

Mọi thay đổi ở Admin lưu thẳng vào MySQL (bảng `content_items`), UI cập nhật ngay (optimistic update)
rồi lưu DB ở background. Xoá hết bằng nút "Xoá toàn bộ nội dung tự thêm" (xoá `content_items`, seed lại
dữ liệu mẫu từ `server/seed.js`).

## Cấu trúc thư mục

```
server/
├── db.js                 # kết nối pool MySQL (đọc .env)
├── schema.sql             # DDL 3 bảng: content_items, item_progress, app_state
├── migrate.js             # chạy schema.sql lên DB (npm run db:migrate)
├── seed.js                # dữ liệu mẫu, dùng để seed khi content_items rỗng
└── index.js               # Express REST API (/api/items, /api/progress)

src/
├── types.ts              # Word, Pattern, ItemProgress, ...
├── data/seed.ts           # (không còn dùng để load runtime — xem server/seed.js)
├── lib/
│   ├── api.ts             # fetch wrapper gọi backend (VITE_API_URL)
│   ├── content.ts         # cache optimistic + gọi API cho nội dung
│   ├── progress.ts        # cache optimistic + gọi API cho tiến độ/streak
│   ├── leitner.ts         # luật lên/ở lại tầng, hàng đợi ôn
│   ├── quiz.ts             # chấm điểm, chọn chiều hỏi, sinh đáp án nhiễu
│   └── speech.ts          # phát âm bằng Web Speech API
├── components/            # WordImage, SpeakButton, Layout, ThemeToggle
└── pages/
    ├── Home.tsx           # 5 thẻ tầng + kho Đã thuộc + streak
    ├── DayDetail.tsx      # xem từ vựng / cấu trúc / flashcard theo tầng
    ├── Review.tsx         # quiz gõ từ (2 dạng) theo luật Leitner
    ├── Mastered.tsx       # danh sách + ôn lại kho Đã thuộc
    ├── Hard.tsx           # luyện tập trung Từ khó
    └── Admin.tsx          # form CRUD + export/import
```

### Data model trong MySQL

- `content_items`: `id`, `kind` (`word`/`pattern`), `data` (JSON — toàn bộ field còn lại), `topic`.
- `item_progress`: `item_id` (FK), `day` (1-5, 6 = Đã thuộc), `correct_streak`, `wrong_count`,
  `last_reviewed_at` (epoch ms), `history` (JSON).
- `app_state`: 1 dòng duy nhất (`id=1`) chứa `streak`, `last_study_date` — vì app single-user, không
  cần bảng `users`.

## Giới hạn hiện tại

- Quiz Leitner (Review) chỉ áp dụng cho **từ vựng**; **cấu trúc câu** học qua tab Flashcard/Từ vựng
  trong DayDetail (chưa có dạng bài kiểm tra riêng cho cấu trúc câu).
- TTS dùng giọng có sẵn của trình duyệt/OS — nếu máy không có giọng `vi-VN`, chế độ nghe tiếng Việt
  sẽ hiện chữ + báo không đọc được, không lỗi ứng dụng.
- Không có backend/đồng bộ nhiều máy — dùng Export/Import JSON ở Admin để chuyển dữ liệu.
