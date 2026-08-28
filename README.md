# ECNA ARC - SmartLead AI Yönetim Sistemi

ECNA ARC Mimarlık & İç Mimarlık için geliştirilmiş; potansiyel müşterileri karşılayan,
yapay zekâ destekli sohbet imkânı sunan ve talepleri (lead) veritabanında toplayıp
yönetim panelinde listeleyen Flask tabanlı web uygulamasıdır.

Canlı sunucu: `https://ecna-arc-smartlead.onrender.com`

---

## Mimari Yapı (Separation of Concerns)

| Dosya | Sorumluluğu |
|---|---|
| `run.py` | Uygulamayı başlatan giriş noktası (`app` nesnesini gunicorn'a verir). |
| `config.py` | `.env` yükleme, ortam değişkenleri ve `Development` / `Production` ayarları. |
| `app/__init__.py` | `create_app()` uygulama fabrikası: CORS, veritabanı ve blueprint kaydı. |
| `app/database.py` | **Projedeki tüm SQL burada.** Ham `sqlite3` ile bağlantı ve kayıt işlemleri. |
| `app/services/ai_service.py` | Groq API entegrasyonu. Flask'ı tanımaz, tek başına test edilebilir. |
| `app/routes.py` | Web sayfaları ve API uç noktaları. **İçinde SQL ve AI kodu yoktur**, sadece ilgili katmanı çağırır. |
| `app/templates/` | `index.html` (tanıtım + randevu formu), `dashboard.html` (yönetim paneli). |
| `wix/chatbot-embed.html` | Wix sitesine gömülen sohbet bileşeni. |

Katmanlar arasındaki akış:

```
Tarayıcı / Wix  →  routes.py  →  ai_service.py  →  Groq API
                        └──────→  database.py   →  leads.db (SQLite)
```

---

## Kurulum ve Çalıştırma

**1. Sanal ortamı oluşturun ve aktif edin**

```powershell
python -m venv venv
venv\Scripts\activate
```

**2. Bağımlılıkları kurun**

```powershell
pip install -r requirements.txt
```

**3. Proje kökünde `.env` dosyası oluşturun**

```
SECRET_KEY=degistirin-rastgele-uzun-bir-deger
DATABASE_URL=leads.db
GROQ_API_KEY=gsk_buraya_kendi_anahtariniz
GROQ_MODEL=openai/gpt-oss-20b
AI_PROVIDER=groq
CORS_ORIGINS=*
```

> **`.env` dosyası ASLA GitHub'a gönderilmez.** `.gitignore` içinde tanımlıdır.
> Anahtarınız yanlışlıkla yayımlandıysa tek gerçek çözüm Groq panelinden
> eski anahtarı **iptal edip (revoke)** yenisini üretmektir; geçmişi temizlemek
> tek başına yeterli değildir.

**4. Uygulamayı başlatın**

```powershell
python run.py
```

Adres: `http://127.0.0.1:5000`

---

## API Uç Noktaları

| Metot | Adres | Açıklama |
|---|---|---|
| `GET` | `/` | Tanıtım sayfası ve randevu/teklif formu. |
| `GET` | `/dashboard` | Gelen taleplerin listelendiği yönetim paneli. |
| `GET` | `/health` | Sunucu canlılık kontrolü + aktif model + anahtarın tanımlı olup olmadığı. |
| `POST` | `/api/sohbet` | Yapay zekâ sohbeti. Gövde: `{"mesaj": "...", "gecmis": [...]}` |
| `POST` | `/api/chat` | `/api/sohbet` ile aynı fonksiyon (eski arayüz uyumluluğu için). |
| `POST` | `/api/leads` | Yeni talep kaydı. Gövde: `{"isim", "telefon", "mesaj", "proje_tipi"}` |
| `GET` | `/api/leads` | Tüm talepleri en yeniden eskiye döndürür. |

Örnek sohbet isteği:

```bash
curl -X POST https://ecna-arc-smartlead.onrender.com/api/sohbet \
     -H "Content-Type: application/json" \
     -d "{\"mesaj\": \"Merhaba, ic mimarlik hizmeti veriyor musunuz?\"}"
```

Başarılı yanıt:

```json
{ "basari": true, "cevap": "Merhaba! Evet, ...", "status": "success" }
```

---

## Wix Entegrasyonu

`wix/chatbot-embed.html` dosyasının tamamı, Wix Editör'de
**Ekle → Katıştır (Embed) → HTML iframe → "Kodu Girin"** alanına yapıştırılır.

> **Kritik:** Dosyadaki `API_ADRESI` **mutlak (absolute)** bir adres olmalıdır.
> `/api/sohbet` gibi göreli bir adres kullanılırsa istek Render'a değil Wix alan
> adına gider ve 404 döner. Sohbetin çalışmama sebebi tam olarak buydu.

---

## Güvenlik Notları

- **SQL Injection:** `database.py` içindeki tüm sorgular `?` yer tutucusu kullanır;
  değerler hiçbir zaman SQL metnine string birleştirmeyle eklenmez.
- **XSS:** Sohbet balonları `innerHTML` yerine `textContent` ile doldurulur.
- **Sır yönetimi:** API anahtarı yalnızca ortam değişkeninden okunur. `/health`
  uç noktası anahtarın kendisini değil, sadece "tanımlı mı" bilgisini döndürür.

---

## Yönergeden Bilinçli Sapma: AI Modeli

Yönergede örnek model olarak `llama-3.1-8b-instant` verilmiştir. Ancak bu model
Groq tarafından **kullanımdan kaldırılmıştır (decommissioned)** ve çağrıldığında
`400 / model_decommissioned` hatası döndürmektedir.

Bu nedenle varsayılan model `openai/gpt-oss-20b` olarak değiştirilmiş, ayrıca
`ai_service.py` içine bir **yedek model zinciri** eklenmiştir: bir model
kullanımdan kaldırılırsa servis otomatik olarak sıradaki modele geçer.

```python
YEDEK_MODELLER = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
]
```

Model adı `GROQ_MODEL` ortam değişkeniyle, **yeniden deploy gerekmeden**
Render panelinden değiştirilebilir.

---

## Render'a Dağıtım (Deploy)

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn run:app`
- **Environment Variables:** `SECRET_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `CORS_ORIGINS`, `FLASK_ENV=production`

GitHub'a yapılan her `push` sonrası Render otomatik olarak yeniden dağıtır
(yaklaşık 60 saniye). Ücretsiz planda sunucu uykuya geçtiği için ilk istek
50 saniyeye kadar sürebilir; gömülü sohbet bileşeni bu süre boyunca
"Yazıyor..." göstererek bekler.
