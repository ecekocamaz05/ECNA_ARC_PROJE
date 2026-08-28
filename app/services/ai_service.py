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

    def _model_al(self):
        """Kullanilacak Groq modelini config'den okur."""
        return Config.GROQ_MODEL

    def _sistem_talimati_al(self):
        """config.py'deki BUSINESS_CONTEXT metnini okur."""
        return Config.BUSINESS_CONTEXT

    def yanit_uret(self, mesaj, gecmis=None):
        """Kullanıcı mesajını Groq API'sine gönderir ve yanıtı döndürür."""
        api_key = Config.GROQ_API_KEY

        # Anahtar yoksa veya demo anahtarsa, çökmek yerine demo mesajı dön
        if not api_key or api_key == 'gsk_demo_key':
            return "Şu anda demo modundayız. Gerçek yanıtlar için API anahtarı gereklidir."

        if gecmis is None:
            gecmis = []

        mesajlar = [{"role": "system", "content": self._sistem_talimati_al()}]
        mesajlar.extend(gecmis)
        mesajlar.append({"role": "user", "content": mesaj})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self._model_al(),
            "messages": mesajlar,
            "temperature": 0.7,
            # Bu model yanit uretmeden once "reasoning" token harciyor; limit
            # dusuk olursa cevap cumle ortasinda kesiliyor (finish_reason=length)
            "max_tokens": 1024
        }

        try:
            response = requests.post(self.GROQ_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            cevap = (data["choices"][0]["message"].get("content") or "").strip()

            if not cevap:
                raise AIServiceError("Yapay zekâdan boş yanıt geldi, lütfen tekrar deneyin.")

            return cevap

        except requests.exceptions.HTTPError as e:
            # 404 = model kullanimdan kaldirilmis, 401 = gecersiz anahtar,
            # 429 = kota asimi. Gercek sebebi loglara yaz ki teshis edilebilsin.
            kod = e.response.status_code if e.response is not None else '?'
            govde = e.response.text[:300] if e.response is not None else ''
            logger.error("Groq API HTTP hatasi %s: %s", kod, govde)
            raise AIServiceError("Yapay zekâ servisine şu anda ulaşılamıyor.")

        except requests.exceptions.RequestException as e:
            logger.error("Groq API baglanti hatasi: %s: %s", type(e).__name__, e)
            raise AIServiceError("Yapay zekâ servisine şu anda ulaşılamıyor.")

        except (KeyError, IndexError, ValueError) as e:
            # Groq beklenmedik bir govde dondurduyse burada yakalanir
            logger.error("Groq yanit ayristirma hatasi: %s: %s", type(e).__name__, e)
            raise AIServiceError("Yapay zekâ yanıtı okunamadı.")


# Dosya sonunda tek bir örnek — routes.py bunu doğrudan import edip kullanacak
ai_service = AIService()