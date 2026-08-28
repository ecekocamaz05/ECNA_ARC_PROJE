import sqlite3

from flask import g

from config import Config

# Yonerge - Modul B: PROJEDEKI TUM SQL BU DOSYADA.
# routes.py buradaki fonksiyonlari cagirir, kendi sorgusunu yazmaz.

# 'leads' tablosunun semasi.
# proje_tipi: yonergenin izin verdigi "ise ozel ek sutun" (mimarlik ofisi icin
# talebin hangi hizmet turune ait oldugunu tutar).
SEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    isim        TEXT NOT NULL,
    telefon     TEXT NOT NULL,
    mesaj       TEXT,
    proje_tipi  TEXT DEFAULT 'Genel',
    tarih       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""


def get_db():
    """Veritabani baglantisini dondurur.

    Baglanti istek boyunca 'g' icinde saklanir; ayni istekte tekrar tekrar
    acilmaz. row_factory sayesinde satirlara sutun ADIYLA erisilir
    (satir['isim'] gibi), sirasiyla degil.
    """
    if 'db' not in g:
        g.db = sqlite3.connect(Config.DATABASE_URL)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    """Istek bitince baglantiyi kapatir (teardown ile otomatik cagrilir)."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db(app):
    """'leads' tablosunu yoksa olusturur ve baglanti kapatmayi kaydeder."""
    # Her istek bitiminde close_db calissin; baglanti sizintisi olmasin
    app.teardown_appcontext(close_db)

    # get_db() 'g' kullandigi icin uygulama baglami gerekiyor
    with app.app_context():
        db = get_db()
        db.execute(SEMA)
        db.commit()


def lead_ekle(isim, telefon, mesaj='', proje_tipi='Genel'):
    """Yeni bir musteri adayi kaydeder ve olusan kaydin id'sini dondurur.

    GUVENLIK: degerler SQL metnine string birlestirmeyle EKLENMEZ. '?' yer
    tutucusu kullanilip degerler ayri bir demet olarak gonderilir; sqlite3
    onlari veri olarak baglar. SQL Injection'a karsi zorunlu korumadir.
    """
    db = get_db()
    imlec = db.execute(
        "INSERT INTO leads (isim, telefon, mesaj, proje_tipi) VALUES (?, ?, ?, ?)",
        (isim, telefon, mesaj, proje_tipi)
    )
    db.commit()
    return imlec.lastrowid


def tum_leadler():
    """Tum kayitlari en yeniden eskiye dogru, sozluk listesi olarak dondurur.

    sqlite3.Row nesnesi JSON'a cevrilemedigi icin burada dict'e cevrilir;
    boylece routes.py veritabani tiplerini hic tanimak zorunda kalmaz.
    """
    db = get_db()
    satirlar = db.execute(
        "SELECT id, isim, telefon, mesaj, proje_tipi, tarih "
        "FROM leads ORDER BY datetime(tarih) DESC, id DESC"
    ).fetchall()
    return [dict(satir) for satir in satirlar]
