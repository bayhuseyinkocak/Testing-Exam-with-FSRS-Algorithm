# Sertifika Sınavı Çalışma Uygulaması — Kararlar ve Yol Haritası

> Bu dosya, yeni bir session açıldığında projeye hızlı başlamak için hazırlanmıştır.
> Yeni session'a şu talimatı verin: "PLAN.md dosyasını oku ve kaldığımız yerden devam et."

---

## 1. Proje Özeti

Kullanıcıların farklı sertifika sınavlarına (örn. Microsoft AB-730, Microsoft AB-731, Almanca B2) hazırlanmasını sağlayan, FSRS (Free Spaced Repetition Scheduling) algoritması ile kişisel tekrar planı yapan bir web uygulaması.

- **Kullanıcı sayısı:** En fazla 10 kişi (admin kullanıcıları manuel oluşturur)
- **Giriş:** Kullanıcı adı + şifre (herkese açık kayıt formu YOK)
- **Platform:** Tarayıcı (mobil ve masaüstü tarayıcıdan açılır)
- **İnternet:** Çevrimiçi çalışır (offline şart değil)
- **İçerik:** Sadece metin; görsel, tablo, formül yok

---

## 2. Onaylanan Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS + TanStack Query |
| Backend | Node.js + Fastify + TypeScript |
| FSRS | `ts-fsrs` (resmi npm paketi — https://github.com/open-spaced-repetition/ts-fsrs) |
| ORM | Drizzle (veya Prisma) — karar: Drizzle tercih edildi |
| Veritabanı | PostgreSQL (sunucuda); geliştirme sırasında SQLite de kullanılabilir |
| Auth | Kullanıcı adı + şifre (bcrypt hash) + JWT |
| Deploy | Vercel (frontend + backend) + Neon (PostgreSQL) + Cloudflare (domain) |

**Alternatif (onaylanmadı):** Python + FastAPI + `py-fsrs` (https://github.com/open-spaced-repetition/py-fsrs)

---

## 3. Mimari

```
┌─────────────────────────────────────────────┐
│              FRONTEND (React + Vite)        │
│  Login │ Sınav seçimi │ Soru CRUD │ Çalışma │
│  Import (CSV/Excel) │ İstatistik            │
└──────────────────┬──────────────────────────┘
                   │ HTTP (JSON)
┌──────────────────▼──────────────────────────┐
│              BACKEND (Node.js + Fastify)    │
│  Auth (JWT) │ Soru bankası API │ Study API  │
│  Import/Export │ İstatistik                 │
│  ┌────────────────────────────────────┐    │
│  │  FSRS Motoru (ts-fsrs)             │    │
│  └────────────────────────────────────┘    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           PostgreSQL (veya SQLite)          │
│  users │ exams │ questions │ options        │
│  user_question_fsrs │ review_logs          │
└─────────────────────────────────────────────┘
```

---

## 4. Veri Modeli

| Tablo | Alanlar | Açıklama |
|---|---|---|
| `users` | id, username, password_hash, role (admin/user), created_at | Max 10 kullanıcı |
| `exams` | id, name, code, description | Örn: "Microsoft AB-730", "Almanca B2" |
| `topics` | id, exam_id, name | Opsiyonel: konu/ünite |
| `questions` | id, exam_id, topic_id, type, question_text, explanation, order | type: `single` / `multiple` / `true_false` / `fill_blank` |
| `options` | id, question_id, option_text, is_correct, order | `single` ve `multiple` tipleri için |
| `statements` | id, question_id, statement_text, correct_value | `true_false` tipi için |
| `blanks` | id, question_id, position, options_json, correct_index | `fill_blank` için |
| `user_question_fsrs` | id, user_id, question_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review | **Her kullanıcı × soru için bir FSRS kartı** |
| `review_logs` | id, user_id, question_id, rating, is_correct, selected_options, answered_at, new_interval, new_stability | FSRS optimizer + istatistik |

**Kritik:** FSRS durumu soruda değil, **kullanıcı-soru çiftinde** tutulur.

---

## 5. Soru Tipleri ve Puanlama Kuralları

| Tip | Açıklama | Doğru Sayılma Kuralı | FSRS Puanı |
|---|---|---|---|
| `single` | 4 seçenek, tek doğru | Doğru şık işaretlenmiş | Doğru → Good/Easy, Yanlış → Again |
| `multiple` | 4 seçenek, 1+ doğru | Tüm doğrular işaretli, tüm yanlışlar boş | Doğru → Good/Easy, eksik/yanlış → Again |
| `true_false` | Her satır için Doğru/Yanlış işaretleme | Tüm ifadeler doğru değerlendirilmiş | Doğru → Good/Easy, biri bile yanlış → Again |
| `fill_blank` | Metin içinde boşluk, 4 seçenekten biri | Doğru seçenek seçilmiş | Doğru → Good/Easy, Yanlış → Again |

Şimdilik kısmi puan YOK. İleride istenirse `Hard` puanı eklenebilir.

---

## 6. FSRS Entegrasyonu

1. Her soru, her kullanıcı için bir FSRS kartıdır (`user_question_fsrs`).
2. Kullanıcı cevap verince backend otomatik kontrol eder.
3. Puanlama: Yanlış → `Again`, Doğru → `Good` (hızlı/emin ise `Easy`).
4. `ts-fsrs` kartın yeni durumunu hesaplar: `due`, `stability`, `difficulty`, `reps`, `lapses`.
5. Yeni durum `user_question_fsrs` tablosuna kaydedilir, `review_logs` tablosuna log atılır.
6. Çalışma oturumu: `GET /api/study/due?exam_id=X` bugün tekrarı gelen soruları getirir.

---

## 7. API Tasarımı (Taslak)

```
# Auth
POST /api/auth/login
GET  /api/auth/me

# Kullanıcı yönetimi (sadece admin)
POST /api/users

# Sınav ve konu
GET/POST/PUT/DELETE /api/exams
GET/POST/PUT/DELETE /api/exams/:id/topics

# Soru bankası (CRUD + düzeltme)
GET/POST/PUT/DELETE /api/exams/:id/questions
GET/POST/PUT/DELETE /api/questions/:id/options
GET/POST/PUT/DELETE /api/questions/:id/statements
GET/POST/PUT/DELETE /api/questions/:id/blanks

# Toplu içe/dışa aktarma
POST /api/questions/import          # CSV / Excel / JSON
GET  /api/exams/:id/export         # JSON olarak indir

# Çalışma oturumu
GET  /api/study/due?exam_id=1      # bugün çözülecek sorular
POST /api/study/answer             # cevap gönder, FSRS işlesin

# İstatistik
GET  /api/stats/overview
```

---

## 8. Yol Haritası

### Faz 1 — Proje İskeleti
- [x] Repo kurulumu (frontend + backend ayrı klasörde)
- [x] Veritabanı şeması ve ORM kurulumu
- [x] Auth sistemi (login, JWT, admin ile kullanıcı oluşturma)
- [x] Boş sayfalar ve gezinme (login, sınav seçimi)

### Faz 2 — Soru Bankası
- [x] Sınav oluşturma / düzenleme / silme
- [x] 4 soru tipi için CRUD ekranları (form ile giriş + düzeltme)
- [x] CSV/Excel içe aktarma
- [x] JSON dışa aktarma (yedekleme)

### Faz 3 — Çalışma Modu (FSRS)
- [x] `ts-fsrs` entegrasyonu
- [x] `GET /study/due` ile günlük tekrar listesi
- [x] 4 soru tipinin çözüm arayüzleri
- [x] Cevap sonrası anlık geri bildirim (doğru cevap + açıklama)
- [x] FSRS kart durumlarının kaydı ve güncellenmesi

### Faz 4 — İstatistik ve İyileştirme
- [x] Kullanıcı paneli: doğruluk oranı, günlük ilerleme, yaklaşan tekrarlar
- [x] Sınav bazlı çalışma seçimi (AB-730 / AB-731 / Almanca B2)
- [x] FSRS parametrelerini kullanıcı verisine göre optimize etme

### Faz 5 — Yayınlama
- [x] Sunucuya deploy (Vercel + Neon + Cloudflare)
- [x] 10 kullanıcı için admin eliyle hesap açma
- [x] Test ve düzeltmeler

---

## 9. Yeni Session İçin Başlangıç Talimatı

Yeni bir session açtığınızda şu mesajı yazmanız yeterli:

> "PLAN.md dosyasını oku. Bu plana göre Faz 1'e başla."

---

## 10. Referanslar

- FSRS resmi sitesi: https://github.com/open-spaced-repetition
- TypeScript FSRS: https://github.com/open-spaced-repetition/ts-fsrs (npm: `ts-fsrs`)
- Python FSRS (yedek alternatif): https://github.com/open-spaced-repetition/py-fsrs (pip: `fsrs`)

---

## 11. Deploy Mimarisi (Onaylandı)

İlk yayın için platform kararı (ücretsiz, kişisel kullanım):

| Katman | Platform |
|---|---|
| Frontend | Vercel (Hobby, statik SPA) |
| Backend | Vercel (serverless Fastify) |
| Veritabanı | Neon (ücretsiz PostgreSQL) |
| Domain | Cloudflare DNS → Vercel |

- **Aynı origin:** Vercel `rewrites` ile `/api/*` → backend fonksiyonuna yönlendirilir; cookie/CORS sorunu olmaz.
- Backend env: `DATABASE_URL` (Neon), `JWT_SECRET`, `NODE_ENV=production`, cookie `secure: true`.
- Domain: Cloudflare'da `example.com` → Vercel. (Cross-domain gerekirse cookie `SameSite=None; Secure` + CORS(credentials).)
- Eski hedef (Docker + Caddy + PostgreSQL) VPS senaryosu için opsiyonel kalır.
