# Sertifika Sınavı Çalışma Uygulaması

FSRS (Free Spaced Repetition Scheduling) algoritması ile kişisel tekrar planı yapan,
sertifika sınavlarına hazırlık web uygulaması. Detaylı kararlar: [PLAN.md](./PLAN.md)

## Özellikler

- **4 soru tipi:** tek seçim, çoklu seçim, doğru/yanlış, boşluk doldurma
- **Türkçe tercüme alanı:** her soru için tek kutuda soru + cevap çevirisi (çalışma ekranında referans)
- **FSRS tekrar planlaması:** her kullanıcı × soru için kişisel kart; akıllı aralıklarla tekrar
- **Çalışma akışı:** cevabı işaretle → kontrol et → anlık geri bildirim → (İyi/Kolay/Tekrar) değerlendir
- **Soru bankası yönetimi:** admin için sınav / konu / soru CRUD
- **Toplu içe/dışa aktarma:** CSV, Excel (.xlsx), JSON
- **İstatistik paneli:** doğruluk oranı, günlük ilerleme, yaklaşan tekrarlar, kart durumları
- **Rol tabanlı erişim:** admin içerik yönetir, kullanıcılar çalışır

## Teknoloji Yığını

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + TanStack Query + React Router
- **Backend:** Node.js + Fastify + TypeScript
- **FSRS:** ts-fsrs
- **ORM:** Drizzle
- **Veritabanı:** PostgreSQL (sunucuda) / SQLite (geliştirmede)
- **Auth:** Kullanıcı adı + şifre (bcrypt) + JWT (httpOnly cookie)

## Klasör Yapısı

```
backend/   Fastify API + Drizzle + SQLite
frontend/  Vite + React SPA
PLAN.md    Proje kararları ve yol haritası
```

## Gereksinimler

- Node.js 22+
- pnpm 9+

## Kurulum

### 1. Backend

```bash
cd backend
pnpm install
cp .env.example .env      # gerekirse düzenle
pnpm db:migrate           # veritabanı şemasını oluştur
pnpm db:seed              # admin kullanıcısı + örnek sınavlar
pnpm dev                  # http://127.0.0.1:8787
```

Varsayılan admin: **kullanıcı adı** `admin` — **şifre** `admin123` (.env içindeki `ADMIN_PASSWORD`).

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev                  # http://localhost:5173 (doluysa 5174)
```

Frontend geliştirme sunucusu `/api` isteklerini `http://127.0.0.1:8787` adresine proxy'ler.

## API

### Auth

| Metod | Yol | Açıklama |
|---|---|---|
| POST | /api/auth/login | Giriş (JWT'yi httpOnly cookie olarak set eder) |
| GET | /api/auth/me | Oturumdaki kullanıcı |
| POST | /api/auth/logout | Çıkış (cookie temizler) |
| GET | /api/users | Kullanıcı listesi (sadece admin) |
| POST | /api/users | Kullanıcı oluşturma (sadece admin) |
| DELETE | /api/users/:id | Kullanıcı silme (sadece admin, kendini silemez) |

### Sınav ve Konu (yönetim: admin)

| Metod | Yol | Açıklama |
|---|---|---|
| GET | /api/exams | Sınav listesi (soru sayısıyla) |
| POST | /api/exams | Sınav oluştur (admin) |
| GET | /api/exams/:id | Sınav detayı + konular |
| PUT | /api/exams/:id | Sınav güncelle (admin) |
| DELETE | /api/exams/:id | Sınav sil (admin, cascade) |
| GET/POST | /api/exams/:examId/topics | Konu listele / oluştur |
| PUT/DELETE | /api/exams/:examId/topics/:topicId | Konu güncelle / sil |

### Soru Bankası (yönetim: admin)

| Metod | Yol | Açıklama |
|---|---|---|
| GET | /api/exams/:examId/questions | Soru listesi (seçenek/ifade/boşluk iç içe) |
| POST | /api/exams/:examId/questions | Soru oluştur |
| GET/PUT/DELETE | /api/questions/:id | Soru getir / güncelle / sil |

### İçe / Dışa Aktarma

| Metod | Yol | Açıklama |
|---|---|---|
| POST | /api/exams/:examId/questions/import | CSV / Excel / JSON dosya içe aktarma (admin) |
| GET | /api/exams/:id/export | JSON dışa aktarma / yedek indirme |

### Çalışma Modu (FSRS)

| Metod | Yol | Açıklama |
|---|---|---|
| GET | /api/study/due?exam_id=1 | Bugün tekrarı gelen sorular (FSRS kartı + soru içeriği) |
| POST | /api/study/check | Cevabı kontrol eder (doğru/yanlış + doğru cevap + açıklama) |
| POST | /api/study/answer | Cevabı işler: FSRS kartını günceller + review_log yazar |

Puanlama: Yanlış → `again`, Doğru → `good` / `easy`.

### İstatistik

| Metod | Yol | Açıklama |
|---|---|---|
| GET | /api/stats/overview | Doğruluk oranı, günlük ilerleme, yaklaşan tekrarlar, kart durumları, sınav bazlı özet |

## İçe Aktarma Formatları

### CSV / Excel

Başlık satırı zorunludur: `type,question_text,explanation,translation,choices,correct`

- `type`: single | multiple | true_false | fill_blank
- `question_text`: soru metni (fill_blank için boşluğu `___` ile işaretleyin)
- `explanation`: açıklama (opsiyonel)
- `translation`: Türkçe tercüme — soru + cevaplar tek kutuda (opsiyonel)
- `choices`: seçenekler, `|` ile ayrılır (örn. `A|B|C|D`; true_false için ifadeler)
- `correct`: doğru cevap, 1 tabanlı indeks, virgülle ayrılır:
  - single → tek sayı (örn. `2`)
  - multiple → virgülle ayrılmış (örn. `1,3`)
  - true_false → T/F (örn. `T,F,T`)
  - fill_blank → tek sayı (tek boşluk; çok boşluk için JSON kullanın)

```csv
type,question_text,explanation,translation,choices,correct
single,2+2 kaçtır?,Temel matematik,2+2 kaçtır? Cevap 4,3|4|5|6,2
multiple,Asal sayıları seç,,Asal sayılar: 2,3,5,2|3|4|5,1,2
true_false,İfadeleri değerlendir,,,Gökyüzü mavidir|Su 50C'de kaynar,T,F
fill_blank,Ich ___ Wasser,Almanca fiil,Ich ___ Wasser (su içerim),trinke|esse|gehe|schlafe,1
```

### JSON

Dışa aktarma formatı ile birebir aynı (tam yedekleme/geri yükleme). `questions` dizisi beklenir:

```json
{"questions":[{"type":"single","question_text":"Soru","explanation":null,"options":[{"option_text":"A","is_correct":false},{"option_text":"B","is_correct":true}]}]}
```

## Yol Haritası Durumu

- [x] Faz 1 — Proje İskeleti
- [x] Faz 2 — Soru Bankası
- [x] Faz 3 — Çalışma Modu (FSRS)
- [x] Faz 4 — İstatistik ve İyileştirme
- [ ] Faz 5 — Yayınlama
