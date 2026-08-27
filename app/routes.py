from flask import Blueprint, render_template, request, jsonify
from app.database import db, Lead
from app.services.ai_service import ai_service

web_bp = Blueprint('web', __name__)
api_bp = Blueprint('api', __name__)

# --- WEB SAYFALARI ---

@web_bp.route('/')
def home():
    return render_template('index.html')

@web_bp.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


# --- API UÇ NOKTALARI ---

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "durum": "aktif",
        "mesaj": "ECNA ARC Mimarlık Yapay Zekâ Servisi Çalışıyor"
    }), 200

@api_bp.route('/sohbet', methods=['POST'])
def sohbet():
    veri = request.get_json()
    if not veri or 'mesaj' not in veri:
        return jsonify({"basari": False, "hata": "Mesaj alanı zorunludur."}), 400

    try:
        yanit = ai_service.yanit_uret(veri['mesaj'])
        return jsonify({"basari": True, "cevap": yanit}), 200
    except Exception as e:
        return jsonify({"basari": False, "hata": str(e)}), 500

@api_bp.route('/leads', methods=['POST'])
def create_lead():
    veri = request.get_json()
    if not veri or 'isim' not in veri or 'telefon' not in veri:
        return jsonify({"basari": False, "hata": "İsim ve telefon alanları zorunludur."}), 400

    try:
        yeni_lead = Lead(
            isim=veri['isim'],
            telefon=veri['telefon'],
            mesaj=veri.get('mesaj', ''),
            proje_tipi=veri.get('proje_tipi', 'Genel')
        )
        db.session.add(yeni_lead)
        db.session.commit()
        return jsonify({"basari": True, "lead_id": yeni_lead.id, "mesaj": "Talebiniz başarıyla alındı."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"basari": False, "hata": str(e)}), 500

@api_bp.route('/leads', methods=['GET'])
def get_leads():
    try:
        leads = Lead.query.order_by(Lead.tarih.desc()).all()
        return jsonify({
            "basari": True,
            "data": [lead.to_dict() for lead in leads]
        }), 200
    except Exception as e:
        return jsonify({"basari": False, "hata": str(e)}), 500