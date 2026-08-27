import os
from config import Config

class AIService:
    def __init__(self):
        self.api_key = getattr(Config, 'GROQ_API_KEY', None)

    def yanit_uret(self, mesaj):
        if not self.api_key or self.api_key == 'gsk_demo_key':
            return "ECNA ARC Yapay Zekâ Asistanı şu an hazır. Sorunuzu iletebilirsiniz."
        
        # Gerçek Groq API çağrısı bu kısımda çalışır
        return f"Proje talebiniz alındı: {mesaj}"

ai_service = AIService()