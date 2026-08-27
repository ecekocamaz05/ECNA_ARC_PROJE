from flask import Flask
from config import Config
from app.database import db, init_db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Veritabanını başlat
    init_db(app)

    # Rotaları içe aktar ve kaydet
    from app.routes import web_bp, api_bp
    app.register_blueprint(web_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    return app