import requests
from flask import current_app


class AIServiceError(Exception):
    """Yapay zekâ servisiyle ilgili bir sorun olduğunda fırlatılır."""
    pass


class AIService:

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "openai/gpt-oss-20b"

    def _sistem_talimati_al(self):
        """config.py'deki BUSINESS_CONTEXT metnini okur."""
        return current_app.config.get('BUSINESS_CONTEXT', 'Sen yardımcı bir asistansın.')

    def yanit_uret(self, mesaj, gecmis=None):
        """Kullanıcı mesajını Groq API'sine gönderir ve yanıtı döndürür."""
        api_key = current_app.config.get('GROQ_API_KEY')

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
            "model": self.MODEL,
            "messages": mesajlar,
            "temperature": 0.7,
            "max_tokens": 300
        }

        try:
            response = requests.post(self.GROQ_URL, headers=headers, json=payload, timeout=15)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

        except requests.exceptions.RequestException as e:
            print(f"Groq API HATASI: {type(e).__name__}: {e}")
            raise AIServiceError("Yapay zekâ servisine şu anda ulaşılamıyor.")


# Dosya sonunda tek bir örnek — routes.py bunu doğrudan import edip kullanacak
ai_service = AIService()