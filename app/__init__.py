import os

from flask import Flask, jsonify
from flask_cors import CORS
from config import config_secenekleri
from app.database import db, init_db

def create_app(config_class=None):
    app = Flask(__name__)

    # Ortam degiskeni yoksa gelistirme ayarlariyla calis
    if config_class is None:
        ortam = os.environ.get('FLASK_ENV', 'default')
        config_class = config_secenekleri.get(ortam, config_secenekleri['default'])

    app.config.from_object(config_class)

    # CORS: Wix ve farklı origin'lerden gelen isteklere izin ver
    CORS(app, origins=app.config.get('CORS_ORIGINS', '*'))

    init_db(app)

    from app.routes import web_bp, api_bp
    app.register_blueprint(web_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    # Yonergedeki sunucu canlilik kontrolu (Render icin de kullanilir)
    @app.route('/health')
    def health():
        return jsonify({
            "durum": "aktif",
            "mesaj": "ECNA ARC Mimarlık Yapay Zekâ Servisi Çalışıyor"
        }), 200

    return app