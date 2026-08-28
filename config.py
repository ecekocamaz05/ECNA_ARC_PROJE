import os
from dotenv import load_dotenv

# .env dosyasını en başta yükle — bu satır olmadan .env asla okunmaz
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'ecna-arc-gizli-anahtar-2026'

    # SQLite veritabani dosyasinin yolu. Ortam degiskeni "sqlite:///..." bicimiyle
    # verilirse bu onek temizlenir; database.py duz bir dosya yolu bekler.
    DATABASE_URL = (os.environ.get('DATABASE_URL')
                    or os.path.join(BASE_DIR, 'leads.db')).replace('sqlite:///', '')

    GROQ_API_KEY = os.environ.get('GROQ_API_KEY') or 'gsk_demo_key'
    AI_PROVIDER = os.environ.get('AI_PROVIDER') or 'groq'
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS') or '*'

    # Groq zaman zaman modelleri kullanimdan kaldiriyor; model adi env'den
    # degistirilebilir olmali ki yeniden deploy gerekmeden guncellenebilsin
    GROQ_MODEL = os.environ.get('GROQ_MODEL') or 'openai/gpt-oss-20b'

    BUSINESS_CONTEXT = """Sen ECNA ARC Mimarlık & İç Mimarlık ofisinin uzman yapay zekâ asistanısın.
Müşterilere mimari tasarım, iç mekân konsept projeleri, uygulama danışmanlığı ve
anahtar teslim çözümler hakkında kısa, profesyonel ve yardımcı yanıtlar ver.
Türkçe konuş. Uygun olduğunda kullanıcıyı randevu/proje teklifi formunu doldurmaya yönlendir."""


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


# create_app() ortama gore dogru sinifi buradan secer
config_secenekleri = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}