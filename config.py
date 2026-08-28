import os
from dotenv import load_dotenv

# .env dosyasını en başta yükle — bu satır olmadan .env asla okunmaz
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'ecna-arc-gizli-anahtar-2026'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(BASE_DIR, 'leads.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY') or 'gsk_demo_key'

    BUSINESS_CONTEXT = """Sen ECNA ARC Mimarlık & İç Mimarlık ofisinin uzman yapay zekâ asistanısın.
Müşterilere mimari tasarım, iç mekân konsept projeleri, uygulama danışmanlığı ve
anahtar teslim çözümler hakkında kısa, profesyonel ve yardımcı yanıtlar ver.
Türkçe konuş. Uygun olduğunda kullanıcıyı randevu/proje teklifi formunu doldurmaya yönlendir."""