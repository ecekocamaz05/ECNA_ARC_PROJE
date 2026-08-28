from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Lead(db.Model):
    __tablename__ = 'leads'

    id = db.Column(db.Integer, primary_key=True)
    isim = db.Column(db.String(100), nullable=False)
    telefon = db.Column(db.String(20), nullable=False)
    mesaj = db.Column(db.Text, nullable=True)
    proje_tipi = db.Column(db.String(50), default='Genel')
    tarih = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'isim': self.isim,
            'telefon': self.telefon,
            'mesaj': self.mesaj,
            'proje_tipi': self.proje_tipi,
            'tarih': self.tarih.strftime('%Y-%m-%d %H:%M:%S')
        }

def init_db(app):
    """Veritabanını başlatır ve tabloları oluşturur."""
    db.init_app(app)
    with app.app_context():
        db.create_all()

def close_db(e=None):
    """Veritabanı oturumunu kapatır."""
    db.session.remove()