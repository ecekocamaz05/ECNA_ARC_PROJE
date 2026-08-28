from flask import Blueprint, render_template, request, jsonify, current_app
from app.database import lead_ekle, tum_leadler
from app.services.ai_service import ai_service, AIServiceError

# Yonerge - Modul D: bu dosyada SQL ve AI kodu YOKTUR.
# Sadece gelen istek dogrulanir ve ilgili katmanin fonksiyonu cagrilir.

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

# Yonergede /api/sohbet isteniyor; /api/chat mevcut arayuzun kullandigi adres
# oldugu icin ikisi de ayni fonksiyona baglandi
@api_bp.route('/sohbet', methods=['POST'])
@api_bp.route('/chat', methods=['POST'])
def sohbet():
    data = request.get_json(silent=True) or {}

    kullanici_mesaji = (
        data.get("mesaj")
        or data.get("message")
        or data.get("prompt")
        or ""
    ).strip()

    if not kullanici_mesaji:
        return _sohbet_hatasi("Lütfen bir mesaj yazın.", 400)

    gecmis = data.get("gecmis") or data.get("history") or []

    try:
        cevap = ai_service.yanit_uret(kullanici_mesaji, gecmis)
    except AIServiceError as e:
        # Dis servis erisilemiyor -> yonergeye gore 503
        current_app.logger.error("/api/sohbet AI hatasi: %s", e)
        return _sohbet_hatasi(str(e), 503)
    except Exception as e:
        current_app.logger.exception("/api/sohbet beklenmedik hata: %s", type(e).__name__)
        return _sohbet_hatasi("Beklenmedik bir hata oluştu.", 500)

    return jsonify({
        "basari": True,
        "cevap": cevap,
        # eski arayuzlerle uyum icin ayni metin bu adlarla da doner
        "response": cevap,
        "reply": cevap,
        "status": "success"
    }), 200


def _sohbet_hatasi(mesaj, kod):
    """Sohbet uc noktasi icin tek tip, guvenli JSON hata yaniti uretir."""
    return jsonify({
        "basari": False,
        "cevap": mesaj,
        "response": mesaj,
        "reply": mesaj,
        "status": "error",
        "hata": mesaj
    }), kod


@api_bp.route('/leads', methods=['POST'])
def create_lead():
    # silent=True: bozuk gövde gelirse Flask HTML hata sayfasi yerine JSON donsun
    veri = request.get_json(silent=True)
    if not veri or not veri.get('isim') or not veri.get('telefon'):
        return jsonify({"basari": False, "hata": "İsim ve telefon alanları zorunludur."}), 400

    try:
        # SQL burada degil, database.py icinde. Bu katman sadece cagirir.
        yeni_id = lead_ekle(
            veri['isim'],
            veri['telefon'],
            veri.get('mesaj', ''),
            veri.get('proje_tipi', 'Genel')
        )
        return jsonify({"basari": True, "lead_id": yeni_id, "mesaj": "Talebiniz başarıyla alındı."}), 201
    except Exception as e:
        current_app.logger.exception("/api/leads POST hatasi: %s", type(e).__name__)
        return jsonify({"basari": False, "hata": "Kayit sirasinda bir hata olustu."}), 500

@api_bp.route('/leads', methods=['GET'])
def get_leads():
    try:
        return jsonify({
            "basari": True,
            "data": tum_leadler()
        }), 200
    except Exception as e:
        current_app.logger.exception("/api/leads GET hatasi: %s", type(e).__name__)
        return jsonify({"basari": False, "hata": "Kayitlar okunamadi."}), 500