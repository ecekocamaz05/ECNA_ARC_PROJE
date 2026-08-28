import logging

import requests

from config import Config

# Bu dosya Flask'i BILMEZ (yonerge - Modul C): ayarlari dogrudan config
# katmanindan, hata kaydini standart logging ile alir.
logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Yapay zekâ servisiyle ilgili bir sorun olduğunda fırlatılır."""
    pass


class AIService:

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    # Groq modelleri periyodik olarak emekliye ayiriyor (llama-3.1-8b-instant ve
    # llama-3.3-70b-versatile bu sekilde kaldirildi ve chatbot'u kirdi). Ilk model
    # 404 donerse sirayla digerleri denenir, boylece servis kendini toparlar.
    YEDEK_MODELLER = [
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "groq/compound-mini",
    ]

    def anahtar_tanimli(self):
        """Gercek bir API anahtari ayarlanmis mi? (deger asla disari verilmez)"""
        api_key = Config.GROQ_API_KEY
        return bool(api_key) and api_key != 'gsk_demo_key'

    def model_sirasi(self):
        """Config'deki model once, ardindan yedekler (tekrarsiz)."""
        sira = [Config.GROQ_MODEL] + self.YEDEK_MODELLER
        return list(dict.fromkeys(sira))

    def _sistem_talimati_al(self):
        """config.py'deki BUSINESS_CONTEXT metnini okur."""
        return Config.BUSINESS_CONTEXT

    def _istek_gonder(self, model, mesajlar, api_key):
        """Tek bir modele istek atar; yaniti dondurur."""
        yanit = requests.post(
            self.GROQ_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": mesajlar,
                "temperature": 0.7,
                # Bu modeller yanit uretmeden once "reasoning" token harciyor;
                # limit dusuk olursa cevap cumle ortasinda kesiliyor
                "max_tokens": 1024
            },
            timeout=30
        )
        yanit.raise_for_status()
        return yanit.json()

    def yanit_uret(self, mesaj, gecmis=None):
        """Kullanıcı mesajını Groq API'sine gönderir ve yanıtı döndürür."""
        # Anahtar yoksa veya demo anahtarsa, çökmek yerine demo mesajı dön
        if not self.anahtar_tanimli():
            logger.warning("GROQ_API_KEY tanimli degil - demo modunda calisiliyor.")
            return ("Şu anda demo modundayız çünkü sunucuda yapay zekâ anahtarı "
                    "tanımlı değil. Yöneticinin GROQ_API_KEY ayarlaması gerekiyor.")

        api_key = Config.GROQ_API_KEY

        mesajlar = [{"role": "system", "content": self._sistem_talimati_al()}]
        mesajlar.extend(gecmis or [])
        mesajlar.append({"role": "user", "content": mesaj})

        son_hata = None

        for model in self.model_sirasi():
            try:
                veri = self._istek_gonder(model, mesajlar, api_key)
                cevap = (veri["choices"][0]["message"].get("content") or "").strip()

                if not cevap:
                    son_hata = "bos yanit"
                    logger.warning("Model %s bos yanit dondu, siradaki deneniyor.", model)
                    continue

                return cevap

            except requests.exceptions.HTTPError as e:
                kod = e.response.status_code if e.response is not None else None
                govde = e.response.text[:300] if e.response is not None else ''
                son_hata = f"HTTP {kod}"

                # Model kaldirilmis/erisim yok -> siradaki modeli dene
                if kod in (400, 404):
                    logger.warning("Model %s kullanilamiyor (%s): %s", model, kod, govde)
                    continue

                # Anahtar veya kota sorunu: model degistirmek fayda etmez
                if kod == 401:
                    logger.error("Groq API anahtari gecersiz (401): %s", govde)
                    raise AIServiceError("Yapay zekâ anahtarı geçersiz. Lütfen yöneticiyle iletişime geçin.")
                if kod == 429:
                    logger.error("Groq kota/hiz limiti asildi (429): %s", govde)
                    raise AIServiceError("Yapay zekâ servisi şu anda yoğun. Lütfen biraz sonra tekrar deneyin.")

                logger.error("Groq API HTTP hatasi %s: %s", kod, govde)
                raise AIServiceError("Yapay zekâ servisine şu anda ulaşılamıyor.")

            except requests.exceptions.RequestException as e:
                logger.error("Groq API baglanti hatasi: %s: %s", type(e).__name__, e)
                raise AIServiceError("Yapay zekâ servisine şu anda ulaşılamıyor.")

            except (KeyError, IndexError, ValueError) as e:
                # Groq beklenmedik bir govde dondurduyse burada yakalanir
                logger.error("Groq yanit ayristirma hatasi: %s: %s", type(e).__name__, e)
                raise AIServiceError("Yapay zekâ yanıtı okunamadı.")

        logger.error("Hicbir model yanit veremedi. Son hata: %s", son_hata)
        raise AIServiceError("Yapay zekâ servisine şu anda ulaşılamıyor.")


# Dosya sonunda tek bir örnek — routes.py bunu doğrudan import edip kullanacak
ai_service = AIService()