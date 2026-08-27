import os
from groq import Groq

def ai_service(user_message):
    api_key = os.environ.get('GROQ_API_KEY')
    
    if not api_key or api_key == 'gsk_demo_key':
        return f"Proje talebiniz alındı: {user_message}"

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen ECNA ARC Mimarlık & İç Mimarlık ofisinin uzman yapay zekâ asistanısın. "
                        "Müşterilere mimari tasarım, iç mekân konsept projeleri, uygulama danışmanlığı "
                        "ve anahtar teslim çözümler hakkında kısa, profesyonel ve yardımcı yanıtlar ver."
                    )
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            temperature=0.7,
            max_tokens=300
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Groq API Hatasi: {e}")
        # Hatanın ne olduğunu doğrudan chat ekranında görebilmek için hata detayını döküyoruz:
        return f"Sistem Hatası: {str(e)}"