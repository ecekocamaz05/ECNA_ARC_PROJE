import os
from groq import Groq

def ai_service(user_message):
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY bulunamadı.")

    try:
        client = Groq(api_key=api_key)

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen ECNA ARC Mimarlık & İç Mimarlık ofisinin "
                        "uzman yapay zekâ asistanısın. "
                        "Müşterilere mimari tasarım, iç mekân konsept "
                        "projeleri, uygulama danışmanlığı ve anahtar teslim "
                        "çözümler hakkında kısa, profesyonel ve yardımcı "
                        "yanıtlar ver."
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
        print(f"Groq API HATASI: {type(e).__name__}: {e}")
        raise