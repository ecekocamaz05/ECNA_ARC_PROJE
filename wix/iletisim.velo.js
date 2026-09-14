/* =====================================================================
   ECNA ARC - ILETISIM SAYFASI: SOHBET KARTI + TALEP FORMU

   Bu dosya SADECE "Iletisim" sayfasinin kod paneline yapistirilir.
   Kod panelini TAMAMEN bosaltip bu dosyanin TAMAMINI yapistirin.
   Import satiri YOKTUR (wix-fetch kullanimdan kalkti; standart fetch kullanilir).

   ID'LER - SOHBET KARTI:
     #textSohbet, #girdiMesaj, #btnGonder                  (zorunlu)
     #kutuSohbet, #btnAc (ac/kapa), #btnKapat,
     #btnOneri1, #btnOneri2                                (opsiyonel)

   ID'LER - TALEP FORMU:
     #girdiAd, #girdiTelefon, #btnKaydet                   (zorunlu)
     #girdiSoyad, #girdiEposta, #girdiNot, #textFormDurum  (opsiyonel)

   Sohbet ve form birbirinden bagimsizdir: biri eksikse digeri yine calisir.
   Dikkat: formun mesaj kutusu "girdiNot", butonu "btnKaydet"; sohbetinkiler
   "girdiMesaj" ve "btnGonder". Karistirmayin.

   NEDEN HICBIR ID'DE BUYUK "I" YOK?
   Turkce klavyede Shift+i, İ (noktali) uretir; JavaScript'in bekledigi I
   (noktasiz) ile ayni karakter DEGILDIR. "girdiIsim" yerine "girdiAd".
   ===================================================================== */

// NOT: 'import { fetch } from "wix-fetch"' satiri BILEREK YOK. Wix bu modulu
// kullanimdan kaldirdi (editor 'deprecated' uyarisi verir); tarayicinin standart
// fetch() fonksiyonu Velo sayfa kodunda dogrudan kullanilabilir.

// Render sunucusunun MUTLAK adresi. Goreli adres ("/api/sohbet") KULLANMAYIN;
// o durumda istek Render'a degil Wix alan adina gider ve 404 doner.
const SUNUCU     = 'https://ecna-arc-smartlead.onrender.com';
const API_SOHBET = SUNUCU + '/api/sohbet';

// Wix'te bir Metin kutusunu koda otomatik kaydirtmak mumkun degil. Bu yuzden
// secim: false = kronolojik (en yeni altta, uzun sohbette elle kaydirilir),
// true  = en yeni mesaj en ustte (kaydirmaya gerek kalmaz).
const YENI_USTTE = true;

// Sunucuya gonderilen konusma gecmisi (AI baglami korusun diye)
const gecmis = [];

// Ekranda gosterilen dokum satirlari
const satirlar = [];


$w.onReady(function () {

    // --- Sohbet baglantilari (kart bu sayfada yoksa atlanir) ---
    guvenli(() => $w('#btnGonder').onClick(() => mesajGonder()), 'btnGonder');

    // Enter'a basinca da gonderilsin
    guvenli(() => {
        $w('#girdiMesaj').onKeyPress((olay) => {
            if (olay.key === 'Enter') {
                mesajGonder();
            }
        });
    }, 'girdiMesaj onKeyPress');

    // --- Kart ac/kapa ---
    // #btnAc her tiklamada kutuyu ACAR / KAPATIR (toggle). Kutu gizliyse
    // gosterir, gorunuyorsa gizler. #kutuSohbet'i editorde "Yuklemede gizli"
    // isaretlerseniz kart kapali baslar ve ilk tiklama acar.
    guvenli(() => $w('#btnAc').onClick(() => {
        const kutu = $w('#kutuSohbet');
        if (kutu.hidden) {
            kutu.show('fade');
        } else {
            kutu.hide('fade');
        }
    }), 'btnAc');
    // Kartin icindeki X de kapatir (varsa)
    guvenli(() => $w('#btnKapat').onClick(() => $w('#kutuSohbet').hide('fade')), 'btnKapat');

    // --- Hazir soru rozetleri (opsiyonel) ---
    // Rozetin uzerindeki yaziyi okuyup dogrudan soru olarak gonderir;
    // boylece metni editorden degistirince kod da kendiliginden uyar.
    guvenli(() => $w('#btnOneri1').onClick(() => oneriGonder('#btnOneri1')), 'btnOneri1');
    guvenli(() => $w('#btnOneri2').onClick(() => oneriGonder('#btnOneri2')), 'btnOneri2');

    // Acilis selamlamasi
    // Acilis selami config.py'deki BUSINESS_CONTEXT kimligiyle uyumlu olmali
    guvenli(() => satirEkle('ECNA ARC', 'Merhaba! ECNA ARC teknoloji ve saha çözümleri asistanıyım. LiDAR şantiye taraması, rölöve dijitalleştirme veya BIM entegrasyonu hakkında ne öğrenmek istersiniz?'), 'textSohbet');
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
        const yanit = markdownTemizle(veri.cevap || 'Bir hata oluştu.');

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

// Groq modelleri yaniti Markdown ile dondurur (**kalin**, - liste, ## baslik).
// Wix Metin ogesi .text ile bunlari bicim olarak degil, oldugu gibi basar;
// ekranda yildiz ve diyez isaretleri kalir. Burada duz yaziya cevriliyor.
const MD_TABLO_SATIRI = /^\s*\|.*\|\s*$/;                       // | a | b |
const MD_TABLO_AYIRICI = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;  // |----|----|

function markdownTemizle(m) {
    const ham = String(m).split('\n');

    // 1) Tablo ayirici satirlarini ve hemen ustlerindeki baslik satirini at
    const atilacak = new Set();
    ham.forEach((s, i) => {
        if (MD_TABLO_AYIRICI.test(s)) {
            atilacak.add(i);
            if (i > 0 && MD_TABLO_SATIRI.test(ham[i - 1])) atilacak.add(i - 1);
        }
    });

    // 2) Kalan tablo satirlarini "• Hucre1: Hucre2 — Hucre3" bicimine cevir
    const satirlar = ham
        .filter((_, i) => !atilacak.has(i))
        .map((s) => {
            if (!MD_TABLO_SATIRI.test(s)) return s;
            const h = s.trim().slice(1, -1).split('|').map((x) => x.trim()).filter(Boolean);
            if (h.length === 0) return '';
            return h.length > 1 ? '• ' + h[0] + ': ' + h.slice(1).join(' — ') : '• ' + h[0];
        });

    // 3) Satir ici isaretleri temizle
    return satirlar.join('\n')
        .replace(/^#{1,6}\s+/gm, '')          // ## Baslik      -> Baslik
        .replace(/\*\*(.+?)\*\*/g, '$1')      // **kalin**      -> kalin
        .replace(/__(.+?)__/g, '$1')          // __kalin__      -> kalin
        .replace(/`([^`]+)`/g, '$1')          // `kod`          -> kod
        .replace(/^\s*[-*]\s+/gm, '• ')       // - madde        -> • madde
        .replace(/\n{3,}/g, '\n\n')           // fazla bos satirlari sikistir
        .trim();
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


/* ==================== TALEP FORMU (POST /api/leads) ==================== */
// Render sunucusunun MUTLAK adresi. Goreli adres ("/api/leads") KULLANMAYIN.
const API_LEADS = 'https://ecna-arc-smartlead.onrender.com/api/leads';


$w.onReady(function () {
    // Form bu sayfada yoksa sohbet etkilenmesin
    guvenli(() => $w('#btnKaydet').onClick(() => talepGonder()), 'btnKaydet');
});


async function talepGonder() {
    const ad      = deger('#girdiAd');
    const soyad   = deger('#girdiSoyad');
    const eposta  = deger('#girdiEposta');
    const telefon = deger('#girdiTelefon');
    const notu    = deger('#girdiNot');

    // Backend zaten 400 donduruyor; burada da kontrol ediyoruz ki ziyaretci
    // sunucuya gidip gelmeyi beklemeden aninda uyari gorsun.
    if (!ad || !telefon) {
        formDurumYaz('Lütfen isim ve telefon alanlarını doldurun.', false);
        return;
    }

    // Ad + soyad tek "isim" alaninda birlesir
    const isim = (ad + ' ' + soyad).trim();

    // E-posta, tabloda ayri sutunu olmadigi icin mesajin basina yazilir
    const mesaj = eposta
        ? 'E-posta: ' + eposta + (notu ? '\n' + notu : '')
        : notu;

    $w('#btnKaydet').disable();
    $w('#btnKaydet').label = 'Gönderiliyor...';
    formDurumYaz('', true);

    try {
        const cevap = await fetch(API_LEADS, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            // KRITIK (yonerge - "Ayni Kelimeler"): alan adlari backend'in
            // bekledigiyle birebir ayni. Bir harf farki kaydi sessizce bozar.
            body: JSON.stringify({
                isim:       isim,
                telefon:    telefon,
                mesaj:      mesaj,
                proje_tipi: 'Genel'
            })
        });

        const veri = await cevap.json();

        if (veri.basari) {
            formDurumYaz('Talebiniz alındı. En kısa sürede size dönüş yapacağız.', true);
            $w('#btnKaydet').label = 'Gönderildi ✓';
            temizle('#girdiAd'); temizle('#girdiSoyad'); temizle('#girdiEposta');
            temizle('#girdiTelefon'); temizle('#girdiNot');
        } else {
            // Backend'in kibar hata metnini goster (yoksa genel mesaj)
            formDurumYaz(veri.hata || 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.', false);
            $w('#btnKaydet').label = 'Gönder';
        }

    } catch (hata) {
        console.error('Lead kayit hatasi:', hata);
        formDurumYaz('Sunucuya ulaşılamadı. Lütfen biraz sonra tekrar deneyin.', false);
        $w('#btnKaydet').label = 'Gönder';
    } finally {
        $w('#btnKaydet').enable();
    }
}


/* --- Yardimcilar --- */

// Eleman sayfada yoksa bos metin doner; boylece opsiyonel alanlar
// eksik oldugunda form yine de calisir.
function deger(id) {
    try {
        return ($w(id).value || '').trim();
    } catch (e) {
        return '';
    }
}

function temizle(id) {
    try {
        $w(id).value = '';
    } catch (e) {
        // eleman yok, sorun degil
    }
}

// #textFormDurum sayfada yoksa sessizce gecer; mesaj her halukarda
// konsola yazilir ki F12 ile teshis yapilabilsin.
function formDurumYaz(mesaj, basarili) {
    if (mesaj) {
        console.log('[Iletisim formu]', basarili ? 'OK' : 'HATA', mesaj);
    }
    try {
        $w('#textFormDurum').text = mesaj;
    } catch (e) {
        // #textFormDurum eklenmemis - buton etiketi zaten geri bildirim veriyor
    }
}
