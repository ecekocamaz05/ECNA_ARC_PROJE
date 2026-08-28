from flask import Flask
from flask_cors import CORS
from config import Config
from app.database import db, init_db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # CORS: Wix ve farklı origin'lerden gelen isteklere izin ver
    CORS(app)

    init_db(app)

    from app.routes import web_bp, api_bp
    app.register_blueprint(web_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    return app