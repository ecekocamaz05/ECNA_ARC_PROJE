import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'ecna-arc-gizli-anahtar-2026'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(BASE_DIR, 'leads.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Eksik olan API Anahtarı
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY') or 'gsk_demo_key'