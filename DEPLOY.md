# Deploy Rehberi — Vercel + Render + Neon + Cloudflare

Bu uygulama kişisel kullanım içindir; aşağıdaki platformların ücretsiz katmanlarıyla yayınlanabilir.

## Mimari

```
Tarayıcı → Vercel (frontend, HTTPS)
              │  /api/*  (rewrite/proxy)
              ▼
          Render (backend Fastify) → Neon (PostgreSQL)

Domain: Cloudflare DNS → Vercel
```

- Frontend ve backend aynı origin altında görünür (Vercel `/api` isteklerini backend'e yönlendirir), bu yüzden cookie/CORS sorunu olmaz.

---

## 1) Neon — Veritabanı

1. [neon.tech](https://neon.tech) → ücretsiz proje oluştur → PostgreSQL database oluştur.
2. **Connection string**'i kopyala (ör. `postgresql://user:pass@xxx.neon.tech/neondb?sslmode=require`).
3. Bu string `DATABASE_URL` olacak.

## 2) Render — Backend

1. [render.com](https://render.com) → **New → Web Service** → GitHub reposuna bağlan.
2. **Root Directory:** `backend`
3. Render `backend/Dockerfile`'ı otomatik algılar (veya Docker build seç).
4. **Environment Variables:**
   - `DATABASE_URL` = Neon connection string
   - `JWT_SECRET` = uzun rastgele bir değer
   - `NODE_ENV` = `production`
   - `HOST` = `0.0.0.0` (Dockerfile'da zaten set, opsiyonel)
5. Deploy et ve backend URL'ini not al (ör. `https://senin-uygulaman.onrender.com`).

> Not: Render ücretsiz web servisi 15 dk inaktif kalınca uyur; ilk istekte birkaç saniye bekler.

### Admin kullanıcısını oluştur (ilk seferde bir kez)

Backend deploy olduktan sonra admin hesabı açmak için seed'i Neon'a karşı çalıştır:

```bash
cd backend
DATABASE_URL="<neon-url>" ADMIN_PASSWORD="<guclu-sifre>" pnpm db:seed
```

## 3) Vercel — Frontend

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub reposuna bağlan.
2. **Root Directory:** `frontend`
3. `frontend/vercel.json` içindeki `YOUR-BACKEND.onrender.com` kısmını gerçek Render backend URL'inle değiştir.
4. Deploy et.

## 4) Cloudflare — Domain

1. Cloudflare'da domainin için **CNAME** kaydı ekle → Vercel'in verdiği `cname.vercel-dns.com` adresine yönlendir.
2. Vercel'de projeye domaini ekle (Settings → Domains).
3. Cloudflare SSL modunu **Full** yap.

---

## Önemli notlar

- **Vercel Hobby** planı ticari olmayan kullanım içindir (bu uygulama uygun).
- **Neon** ücretsiz katmanı demo için yeterlidir; yedeği `GET /api/exams/:id/export` (JSON) ile alınabilir.
- **Render** ücretsiz Postgres değil; DB Neon'da, backend Render'da.
- Domain henüz yoksa `*.vercel.app` ve `*.onrender.com` URL'leriyle de kullanılabilir (cross-domain olursa cookie için ek ayar gerekir — bu yüzden `/api` rewrite'ı önerilir).
