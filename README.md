# ECNA ARC - SmartLead AI Yönetim Sistemi

ECNA ARC Mimarlık & İç Mimarlık için geliştirilmiş; potansiyel müşterileri karşılayan, yapay zekâ destekli sohbet imkânı sunan ve talepleri (lead) veritabanında toplayıp yönetim panelinde listeleyen Flask tabanlı web uygulamasıdır.

## Mimari Yapı (Separation of Concerns)
- **`app/database.py`**: SQLite veritabanı modelleme ve kayıt işlemleri.
- **`app/services/ai_service.py`**: Groq AI API entegrasyonu ve sohbet mantığı.
- **`app/routes.py`**: Web sayfaları ve API uç noktalarının (endpoints) yönetimi.
- **`config.py`**: Yapılandırma ve `.env` ortam değişkenleri.
- **`run.py`**: Uygulamayı başlatan giriş noktası.

## Kurulum ve Çalıştırma

1. Sanal ortamı aktif edin:
   ```powershell
   venv\Scripts\activatepip install -r requirements.txtSECRET_KEY=ecna-arc-gizli-anahtar-2026
DATABASE_URL=sqlite:///leads.db
GROQ_API_KEY=gsk_your_key_here