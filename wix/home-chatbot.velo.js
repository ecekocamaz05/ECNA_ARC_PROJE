/* =====================================================================
   ECNA ARC - KARSILAMA SAYFASI SOHBETI (Yonerge Modul G / Arayuz 1)

   Wix'in kendi tasarim ogeleriyle (Kutu, Metin, Giris, Dugme) yapilmis
   bir sohbet kartini kendi Flask/Groq backend'imize baglar.
   HTML gomme (iframe) KULLANMAZ; yonergenin istedigi wix-fetch yolu budur.

   NEREYE YAPISTIRILIR?
   Wix Studio > Dev Mode (Velo) ACIK > Ana sayfa (Home) > alttaki kod
   panelinde bu dosyanin TAMAMINI yapistirin.

   ---------------------------------------------------------------------
   SAYFADA BULUNMASI GEREKEN ELEMAN ID'LERI

   ZORUNLU (bu ucu olmadan sohbet calismaz):
     #textSohbet    -> Metin      (konusma dokumu; kartin ortasindaki alan)
     #girdiMesaj    -> Giris/Input ("Nasil yardimci olabiliriz?" kutusu)
     #btnGonder     -> Dugme      (saga bakan ok butonu)

   OPSIYONEL (yoksa kod sessizce atlar, hata vermez):
     #kutuSohbet    -> Kutu       (tum karti saran cerceve; ac/kapa icin)
     #btnAc         -> Dugme      ("CHAT'e sor" butonu)
     #btnKapat      -> Dugme      (sag ustteki X)
     #btnOneri1     -> Dugme      (hazir soru rozeti 1)
     #btnOneri2     -> Dugme      (hazir soru rozeti 2)

   OPSIYONEL - TALEP FORMU (kartin altina koyarsaniz):
     #girdiAd       -> Giris      (ad soyad)
     #girdiTelefon  -> Giris      (telefon)
     #btnKaydet     -> Dugme      ("Talep Gonder")
     #textFormDurum -> Metin      (sonuc mesaji)

   ID'ler birebir ayni olmali. Bir harf farki baglantiyi koparir.

   NEDEN HICBIR ID'DE BUYUK "I" YOK?
   Turkce klavyede Shift+i, İ (noktali buyuk I) uretir; bu, JavaScript'in
   bekledigi I (noktasiz buyuk I) harfinden FARKLI bir karakterdir. Ekranda
   neredeyse ayni gorunur ama kod elemani bulamaz ve teshisi cok zordur.
   Bu yuzden "textIsim" degil "girdiAd" gibi adlar secildi.
   ===================================================================== */

import { fetch } from 'wix-fetch';

// Render sunucusunun MUTLAK adresi. Goreli adres ("/api/sohbet") KULLANMAYIN;
// o durumda istek Render'a degil Wix alan adina gider ve 404 doner.
const SUNUCU     = 'https://ecna-arc-smartlead.onrender.com';
const API_SOHBET = SUNUCU + '/api/sohbet';
const API_LEADS  = SUNUCU + '/api/leads';

// Wix'te bir Metin kutusunu koda otomatik kaydirtmak mumkun degil. Bu yuzden
// secim: false = kronolojik (en yeni altta, uzun sohbette elle kaydirilir),
// true  = en yeni mesaj en ustte (kaydirmaya gerek kalmaz).
const YENI_USTTE = true;

// Sunucuya gonderilen konusma gecmisi (AI baglami korusun diye)
const gecmis = [];

// Ekranda gosterilen dokum satirlari
const satirlar = [];


$w.onReady(function () {

    // --- Zorunlu baglantilar ---
    $w('#btnGonder').onClick(() => mesajGonder());

    // Enter'a basinca da gonderilsin
    guvenli(() => {
        $w('#girdiMesaj').onKeyPress((olay) => {
            if (olay.key === 'Enter') {
                mesajGonder();
            }
        });
    }, 'girdiMesaj onKeyPress');

    // --- Kart ac/kapa (opsiyonel) ---
    // Not: #kutuSohbet'i editorde "Yuklemede gizli" isaretlerseniz kart
    // kapali baslar ve "CHAT'e sor" butonuyla acilir.
    guvenli(() => $w('#btnAc').onClick(() => $w('#kutuSohbet').show()), 'btnAc');
    guvenli(() => $w('#btnKapat').onClick(() => $w('#kutuSohbet').hide()), 'btnKapat');

    // --- Hazir soru rozetleri (opsiyonel) ---
    // Rozetin uzerindeki yaziyi okuyup dogrudan soru olarak gonderir;
    // boylece metni editorden degistirince kod da kendiliginden uyar.
    guvenli(() => $w('#btnOneri1').onClick(() => oneriGonder('#btnOneri1')), 'btnOneri1');
    guvenli(() => $w('#btnOneri2').onClick(() => oneriGonder('#btnOneri2')), 'btnOneri2');

    // --- Talep formu (opsiyonel) ---
    guvenli(() => $w('#btnKaydet').onClick(() => talepGonder()), 'btnKaydet');

    // Acilis selamlamasi
    satirEkle('ECNA ARC', 'Merhaba! ECNA ARC Mimarlık asistanıyım. Projeniz hakkında ne sormak istersiniz?');
});


/* ==================== SOHBET ==================== */

async function mesajGonder() {
    const metin = ($w('#girdiMesaj').value || '').trim();
    if (!metin) return;

    satirEkle('Siz', metin);
    $w('#girdiMesaj').value = '';

    // Cift gonderimi engelle; Render uykudaysa istek 50 saniye surebilir
    $w('#btnGonder').disable();
    satirEkle('ECNA ARC', 'Yazıyor...');

    try {
        const cevap = await fetch(API_SOHBET, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mesaj: metin, gecmis: gecmis.slice(-8) })
        });

        const veri = await cevap.json();
        const yanit = veri.cevap || 'Bir hata oluştu.';

        sonSatiriDegistir('ECNA ARC', yanit);

        // Sadece basarili turu gecmise yaz; hatali yanit baglami bozar
        if (veri.basari) {
            gecmis.push({ role: 'user', content: metin });
            gecmis.push({ role: 'assistant', content: yanit });
        }

    } catch (hata) {
        console.error('Sohbet hatasi:', hata);
        sonSatiriDegistir('ECNA ARC', 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
    } finally {
        $w('#btnGonder').enable();
    }
}


// Rozetin uzerindeki yaziyi alip soru olarak gonderir
function oneriGonder(rozetId) {
    const yazi = ($w(rozetId).label || '').trim();
    if (!yazi) return;
    $w('#girdiMesaj').value = yazi;
    mesajGonder();
}


/* ==================== TALEP FORMU ==================== */

async function talepGonder() {
    const ad      = ($w('#girdiAd').value || '').trim();
    const telefon = ($w('#girdiTelefon').value || '').trim();

    // Backend zaten 400 donduruyor; burada da bakiyoruz ki kullanici
    // sunucuya gidip gelmeyi beklemeden aninda uyari gorsun.
    if (!ad || !telefon) {
        formDurumYaz('Lütfen ad ve telefon alanlarını doldurun.');
        return;
    }

    $w('#btnKaydet').disable();
    formDurumYaz('Gönderiliyor...');

    try {
        const cevap = await fetch(API_LEADS, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            // KRITIK (yonerge - "Ayni Kelimeler"): alan adlari backend'in
            // bekledigiyle birebir ayni olmali. database.lead_ekle() bunlari
            // isim / telefon / mesaj / proje_tipi olarak okuyor.
            body: JSON.stringify({
                isim:       ad,
                telefon:    telefon,
                mesaj:      'Karşılama sayfası sohbetinden bırakıldı.',
                proje_tipi: 'Genel'
            })
        });

        const veri = await cevap.json();

        if (veri.basari) {
            formDurumYaz('Talebiniz alındı. En kısa sürede size dönüş yapacağız.');
            $w('#girdiAd').value = '';
            $w('#girdiTelefon').value = '';
        } else {
            formDurumYaz(veri.hata || 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.');
        }

    } catch (hata) {
        console.error('Lead kayit hatasi:', hata);
        formDurumYaz('Sunucuya ulaşılamadı. Lütfen biraz sonra tekrar deneyin.');
    } finally {
        $w('#btnKaydet').enable();
    }
}


/* ==================== YARDIMCILAR ==================== */

// Dokume yeni bir satir ekler ve ekrani tazeler
function satirEkle(kim, metin) {
    satirlar.push(kim + ': ' + metin);
    dokumuYaz();
}

// "Yazıyor..." satirini gercek yanitla degistirir
function sonSatiriDegistir(kim, metin) {
    if (satirlar.length === 0) {
        satirEkle(kim, metin);
        return;
    }
    satirlar[satirlar.length - 1] = kim + ': ' + metin;
    dokumuYaz();
}

function dokumuYaz() {
    const sira = YENI_USTTE ? satirlar.slice().reverse() : satirlar;

    // GUVENLIK: .html DEGIL .text kullaniliyor.
    // Yapay zekadan veya kullanicidan gelen metin HTML olarak yorumlanirsa
    // sayfaya kod enjekte edilebilir. .text ile her sey duz yazi kalir.
    $w('#textSohbet').text = sira.join('\n\n');
}

function formDurumYaz(mesaj) {
    console.log('[Talep formu]', mesaj);
    guvenli(() => { $w('#textFormDurum').text = mesaj; }, 'textFormDurum');
}

// Opsiyonel elemanlar sayfada yoksa $w(...) hata firlatir ve ARDINDAN GELEN
// TUM KOD CALISMAZ. Bu sarmalayici sayesinde eksik bir eleman sadece kendi
// ozelligini devre disi birakir, sohbetin tamami colmez.
function guvenli(islev, ad) {
    try {
        islev();
    } catch (e) {
        console.log('Atlandi (sayfada yok): ' + ad);
    }
}
