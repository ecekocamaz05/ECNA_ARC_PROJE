import os
from groq import Groq

def generate_ai_response(user_message):
    api_key = os.environ.get('GROQ_API_KEY')
    
    # API anahtarı yoksa veya demo ise varsayılan mesaja düşer
    if not api_key or api_key == 'gsk_demo_key':
        return f"Proje talebiniz alındı: {user_message}"

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen ECNA ARC Mimarlık & İç Mimarlık ofisinin uzman yapay zekâ asistanısın. "
                        "Müşterilere mimari tasarım, iç mekân konsept projeleri, uygulama danışmanlığı "
                        "ve anahtar teslim çözümler hakkında nazik, profesyonel ve bilgilendirici yanıtlar ver."
                    )
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            temperature=0.7,
            max_tokens=500
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Groq API Hası: {e}")
        return "Şu anda yapay zekâ servisinde bir yoğunluk var. Lütfen talebinizi sağdaki form üzerinden iletin."