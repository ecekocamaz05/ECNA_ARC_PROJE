/* =====================================================================
   ECNA ARC - YONETIM PANELI (Arayuz 2 / B2B)
   Yonerge Modul G - Arayuz 2: Repeater + Velo + GET /api/leads

   NEREYE YAPISTIRILIR?
   Wix Studio Editor > Dev Mode (Velo) ACIK > "Yonetim Paneli" sayfasi >
   alttaki kod panelinde bu dosyanin TAMAMI. Wix'in hazir ornek kodunu
   ("// Velo API Referansi..." blogu) once silin.

   SAYFADA BULUNMASI GEREKEN ELEMAN ID'LERI (hepsi zorunlu):
     #leadRepeater   -> Repeater (tekrarlayici)
       Repeater'in ICINDE, SADECE ILK SATIRDA (soldan saga):
         #textAd         -> Text   (ad soyad - form zaten birlestirip gonderir)
         #textTelefon    -> Text
         #textMail       -> Text   (e-posta)
         #textMesaj      -> Text

   ID'ler birebir ayni olmali. Bir harf farki baglantiyi koparir.

   REPEATER HAKKINDA BILINMESI GEREKEN:
   Repeater'da ID'ler SADECE ILK SATIRDAKI elemanlara verilir. Bir elemana
   ID verdiginizde diger satirlardaki karsiliklari da ayni ID'yi alir;
   bu bir hata degil, Repeater'in calisma bicimidir (tek sablon, cok satir).

   YENILEME:
   Sayfada "Yenile" butonu yok; liste sayfa her acildiginda sunucudan
   cekilir. Yeni kayitlari gormek icin sayfayi yenilemek yeterlidir.

   MAIL NEREDEN GELIYOR?
   Veritabaninda ayri bir e-posta sutunu YOK. Iletisim formu (iletisim-
   formu.velo.js) e-postayi mesajin ilk satirina "E-posta: ..." olarak
   yazar; bu dosya o satiri ayirip #textMail'e, kalanini #textMesaj'a
   basar. Iki dosyadaki EPOSTA_ONEKI sabiti AYNI olmak zorundadir.

   NEDEN "textAd", "textIsim" DEGIL?
   Turkce klavyede Shift+i, İ (noktali buyuk I) uretir; bu, JavaScript'in
   bekledigi I (noktasiz buyuk I) harfinden FARKLI bir karakterdir. Ekranda
   neredeyse ayni gorunur ama kod elemani bulamaz ve teshisi cok zordur.
   ===================================================================== */

import { fetch } from 'wix-fetch';

// Render sunucusunun MUTLAK adresi. Goreli adres ("/api/leads") KULLANMAYIN;
// o durumda istek Render'a degil Wix alan adina gider ve 404 doner.
const API_ADRESI = 'https://ecna-arc-smartlead.onrender.com/api/leads';

// Iletisim formunun mesajin basina yazdigi onek. Formdaki ile birebir ayni.
const EPOSTA_ONEKI = 'E-posta: ';


$w.onReady(function () {
    // Repeater'in her satiri hazir oldugunda calisir.
    // $item = o satirin kapsami, itemData = o satirin verisi.
    $w('#leadRepeater').onItemReady(($item, itemData) => {
        $item('#textAd').text      = itemData.isim    || '-';
        $item('#textTelefon').text = itemData.telefon || '-';
        $item('#textMail').text    = itemData.eposta  || '-';
        $item('#textMesaj').text   = itemData.mesaj   || '-';
    });

    leadleriGetir();
});


async function leadleriGetir() {
    console.log('[Yonetim Paneli] Kayitlar yukleniyor (sunucu uykudaysa 50 sn surebilir)');

    try {
        const cevap = await fetch(API_ADRESI, {
            method: 'get',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!cevap.ok) {
            throw new Error('Sunucu ' + cevap.status + ' döndü');
        }

        const veri = await cevap.json();

        // Backend her yanitta "basari" alani dondurur (Yonerge Modul D kurali)
        if (!veri.basari) {
            throw new Error(veri.hata || 'Bilinmeyen sunucu hatası');
        }

        const kayitlar = veri.data || [];

        // Backend zaten en yeniden eskiye siralar (yonerge Modul B).
        // KRITIK: Wix Repeater her nesnede STRING tipinde bir _id bekler.
        // Backend "id" (sayi) donduruyor; donusumu burada yapiyoruz ki
        // backend Wix'e ozel bir alan tasimak zorunda kalmasin.
        $w('#leadRepeater').data = kayitlar.map((k) => {
            const parca = mesajiAyir(k.mesaj);
            return {
                _id:     String(k.id),
                isim:    k.isim,
                telefon: k.telefon,
                eposta:  parca.eposta,
                mesaj:   kisalt(parca.metin, 90)
            };
        });

        console.log('[Yonetim Paneli]', kayitlar.length, 'kayit listeleniyor');

    } catch (hata) {
        console.error('[Yonetim Paneli] Lead listeleme hatasi:', hata);
        $w('#leadRepeater').data = [];
    }
}


/* --- Yardimci fonksiyonlar --- */

// "E-posta: x@y.com\nMerhaba..." -> { eposta: "x@y.com", metin: "Merhaba..." }
// Onek yoksa (baska kaynaktan gelen kayit) e-posta "-" olur, mesaj oldugu gibi kalir.
function mesajiAyir(ham) {
    if (!ham) {
        return { eposta: '-', metin: '-' };
    }
    const satirlar = ham.split('\n');
    if (satirlar[0].indexOf(EPOSTA_ONEKI) === 0) {
        return {
            eposta: satirlar[0].slice(EPOSTA_ONEKI.length).trim() || '-',
            metin:  satirlar.slice(1).join('\n').trim() || '-'
        };
    }
    return { eposta: '-', metin: ham };
}

// Uzun mesajlarin satiri bozmasini engeller
function kisalt(metin, sinir) {
    if (!metin) return '-';
    return metin.length > sinir ? metin.slice(0, sinir) + '…' : metin;
}
