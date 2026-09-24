# Deploy Rehberi — Vercel (frontend + backend) + Neon + Cloudflare

Kart gerektirmeyen ücretsiz yayın mimarisi. Kişisel kullanım içindir.

## Mimari

```
Tarayıcı → Vercel (frontend, statik)
              │  /api/*  (rewrite)
              ▼
          Vercel (backend, serverless Fastify) → Neon (PostgreSQL)

Domain: Cloudflare DNS → Vercel
```

---

## 1) Neon — Veritabanı (✓ tamamlandı)

- Bağlantı: Neon connection string (`DATABASE_URL`).
- Tablolar (migration) ve admin kullanıcısı (seed) Neon'a kuruldu.

## 2) Vercel — Backend (serverless)

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub reposuna bağlan.
2. **Root Directory:** `backend`
3. **Environment Variables:**
   - `DATABASE_URL` = Neon connection string
   - `JWT_SECRET` = uzun rastgele değer
   - `NODE_ENV` = `production`
4. Deploy et. Vercel `backend/api/index.ts`'i otomatik serverless fonksiyon olarak algılar.
5. Backend URL'ini not al (ör. `https://senin-backend.vercel.app`).

## 3) Vercel — Frontend

1. **Add New Project** → aynı repo → **Root Directory:** `frontend`
2. `frontend/vercel.json` içindeki `YOUR-BACKEND.onrender.com` yerine backend'in Vercel URL'ini yaz.
3. Deploy et.

## 4) Cloudflare — Domain (opsiyonel)

1. Cloudflare'da **CNAME** → Vercel'in `cname.vercel-dns.com` adresine yönlendir.
2. Vercel'de projeye domaini ekle (Settings → Domains).
3. Cloudflare SSL modunu **Full** yap.

---

## Önemli notlar

- **Dosya içe aktarma limiti:** Vercel serverless ~4.5 MB istek limiti vardır. Soru bankası CSV/Excel dosyan bu boyutun altındaysa sorun yok; büyükse parçalara bölerek içe aktar.
- **Cold start:** ücretsiz Vercel'de ilk istek birkaç saniye gecikebilir (normal).
- **Admin:** İlk admin kullanıcısı Neon'a seed ile oluşturuldu; şifre ayrıca iletildi. Sonra uygulama içinden (Kullanıcılar sayfası) yeni hesaplar açılır.
