/* =====================================================================
   ECNA ARC - HAKKIMIZDA SAYFASI: SOHBET KARTI + EKIP BOLUMU ANIMASYONU

   Bu dosya SADECE "Hakkimizda" sayfasinin kod paneline yapistirilir.
   Home sayfasinin kodu ayri dosyadadir (home-chatbot.velo.js), ona dokunmayin.

   Wix'in kendi tasarim ogeleriyle (Kutu, Metin, Giris, Dugme) yapilmis
   bir sohbet kartini kendi Flask/Groq backend'imize baglar.
   HTML gomme (iframe) KULLANMAZ; yonergenin istedigi Velo + fetch yolu budur.

   NEREYE YAPISTIRILIR?
   Wix Studio > Dev Mode (Velo) ACIK > "Hakkimizda" sayfasi > kod panelini
   TAMAMEN bosaltip bu dosyanin TAMAMINI yapistirin.

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

   EKIP BOLUMU ANIMASYONU (bu sayfaya ozel):
     #revealButton  -> Dugme      (tiklaninca ekip kartlari acilir)
     #overlayBox    -> Kutu       (ekibi orten siyah katman)
     #teamSection   -> Bolum/Kutu (ekip kartlari)

   Sohbet karti bu sayfada yoksa sohbet kismi sessizce atlanir, animasyon
   yine calisir; tersi de gecerli.

   ID'ler birebir ayni olmali. Bir harf farki baglantiyi koparir.

   NOT - TALEP (LEAD) FORMU BU DOSYADA YOKTUR.
   Ad/telefon toplama isi bilerek disari alindi. Ancak formun sitede BIR
   YERDE olmasi gerekir: yoksa /api/leads'e hicbir kayit gitmez ve yonetim
   paneli sonsuza kadar bos kalir. Form icin iki hazir secenek:
     - wix/chatbot-embed.html  (HTML gomme; icinde sohbet + form birlikte)
     - Ayri bir Velo bloguyla POST /api/leads (bu dosyanin onceki surumu:
       git geçmişinde 43a6471 numarali commit)

   NEDEN HICBIR ID'DE BUYUK "I" YOK?
   Turkce klavyede Shift+i, İ (noktali buyuk I) uretir; bu, JavaScript'in
   bekledigi I (noktasiz buyuk I) harfinden FARKLI bir karakterdir. Ekranda
   neredeyse ayni gorunur ama kod elemani bulamaz ve teshisi cok zordur.
   Bu yuzden "girdiIleti" degil "girdiMesaj" gibi adlar secildi.
   ===================================================================== */

// TUM import SATIRLARI DOSYANIN EN USTUNDE OLMALI. Ortaya yapistirilan bir
// import, Wix'in dosyayi derlemesini engeller ve sayfadaki hicbir kod calismaz.
import { timeline } from 'wix-animations';

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

    // --- Ekip bolumu animasyonu (sohbetten bagimsiz, ONCE kurulur) ---
    ekipAnimasyonuKur();

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


/* ==================== EKIP BOLUMU ANIMASYONU ==================== */

// #revealButton'a tiklaninca buton kucularak kaybolur, siyah ortu (#overlayBox)
// silinir ve ekip kartlari (#teamSection) belirir. Uc elemandan biri sayfada
// yoksa guvenli() sayesinde sadece bu ozellik atlanir.
function ekipAnimasyonuKur() {
    guvenli(() => {
        const ekip  = $w('#teamSection');
        const ortu  = $w('#overlayBox');
        const dugme = $w('#revealButton');

        // Baslangic durumu: ekip gorunmez. Velo elemanlarinda ".opacity = 0"
        // diye bir ozellik YOK; sifir sureli bir timeline ile ayarlanir.
        timeline().add(ekip, { opacity: 0, duration: 0 }).play();

        dugme.onClick(() => {
            timeline()
                // 1. Buton kuculup kaybolur
                .add(dugme, { opacity: 0, scale: 0.8, duration: 400, easing: 'easeOutQuad' })
                // 2. Siyah ortu buyuyerek silinir (bir onceki bitmeden 200 ms once baslar)
                .add(ortu,  { opacity: 0, scale: 1.05, duration: 800, easing: 'easeInOutCubic' }, '-=200')
                // 3. Ekip kartlari belirir
                .add(ekip,  { opacity: 1, duration: 600, easing: 'easeInQuad' }, '-=400')
                // play() Promise DONDURMEZ (.then calismaz); bitis icin onComplete kullanilir.
                // Ortu seffaf olsa da tiklamalari yakalar; bu yuzden bitince tamamen gizlenir.
                .onComplete(() => ortu.hide())
                .play();
        });
    }, 'ekip animasyonu (#teamSection / #overlayBox / #revealButton)');
}
