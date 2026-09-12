/* =====================================================================
   ECNA ARC - YONETIM PANELI (Arayuz 2 / B2B)
   Yonerge Modul G - Arayuz 2: Repeater + Velo + GET /api/leads

   NEREYE YAPISTIRILIR?
   Wix Studio Editor > sol menu > Dev Mode (Velo) ACIK olmali.
   Sonra "Yonetim Paneli" sayfasini acin ve alttaki kod panelinde
   (Page Code) bu dosyanin TAMAMINI yapistirin.

   SAYFADA BULUNMASI GEREKEN ELEMAN ID'LERI:
     #leadRepeater   -> Repeater (tekrarlayici)
       Repeater'in ICINDE (her satirda):
         #textAd         -> Text   (musteri adi)
         #textTelefon    -> Text
         #textProjeTipi  -> Text
         #textMesaj      -> Text
         #textTarih      -> Text
     #textDurum      -> Text  (opsiyonel, durum/hata mesaji icin)
     #btnYenile      -> Button (opsiyonel, "Yenile" - sunucudan tekrar ceker)
     #btnSirala      -> Button (opsiyonel, "Siralama" - yeni/eski yonunu cevirir)

   REPEATER HAKKINDA BILINMESI GEREKEN:
   Repeater'da ID'ler SADECE ILK SATIRDAKI elemanlara verilir. Bir elemana
   ID verdiginizde diger satirlardaki karsiliklari da ayni ID'yi alir;
   bu bir hata degil, Repeater'in calisma bicimidir (tek sablon, cok satir).

   ID'ler birebir ayni olmali. Bir harf farki baglantiyi koparir.

   NEDEN "textAd", "textIsim" DEGIL?
   Turkce klavyede Shift+i, İ (noktali buyuk I) uretir; bu, JavaScript'in
   bekledigi I (noktasiz buyuk I) harfinden FARKLI bir karakterdir. Ekranda
   neredeyse ayni gorunur ama kod elemani bulamaz ve teshisi cok zordur.
   Bu tuzaga hic girmemek icin buyuk I harfi iceren ID kullanilmiyor.
   ===================================================================== */

import { fetch } from 'wix-fetch';

// Render sunucusunun MUTLAK adresi. Goreli adres ("/api/leads") KULLANMAYIN;
// o durumda istek Render'a degil Wix alan adina gider ve 404 doner.
const API_ADRESI = 'https://ecna-arc-smartlead.onrender.com/api/leads';

// Siralama yonu. Backend zaten en yeniden eskiye gonderir (yonerge Modul B);
// "Siralama" butonu bu yonu tersine cevirir. Sunucuya tekrar gitmez,
// son cekilen kayitlari yeniden dizer.
let yeniUstte = true;
let sonKayitlar = [];

$w.onReady(function () {
    // Repeater'in her satiri hazir oldugunda calisir.
    // $item = o satirin kapsami, itemData = o satirin verisi.
    $w('#leadRepeater').onItemReady(($item, itemData) => {
        $item('#textAd').text      = itemData.isim      || '-';
        $item('#textTelefon').text   = itemData.telefon   || '-';
        $item('#textProjeTipi').text = itemData.projeTipi || 'Genel';
        $item('#textMesaj').text     = itemData.mesajKisa || '-';
        $item('#textTarih').text     = itemData.tarihGosterim || '-';
    });

    // "Yenile" butonu sayfada varsa bagla. Eleman yoksa Velo hata firlatir;
    // bu yuzden try-catch ile sariliyor ki liste yine de yuklensin.
    try {
        $w('#btnYenile').onClick(() => leadleriGetir());
    } catch (e) {
        console.log('#btnYenile sayfada yok, atlandi.');
    }

    // "Siralama" butonu: en yeni ustte <-> en eski ustte
    try {
        $w('#btnSirala').onClick(() => {
            yeniUstte = !yeniUstte;
            $w('#btnSirala').label = yeniUstte ? 'Sıralama: Yeni → Eski' : 'Sıralama: Eski → Yeni';
            repeaterDoldur();
        });
    } catch (e) {
        console.log('#btnSirala sayfada yok, atlandi.');
    }

    leadleriGetir();
});


async function leadleriGetir() {
    durumYaz('Kayıtlar yükleniyor... (sunucu uykudaysa 50 saniye sürebilir)');

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

        sonKayitlar = veri.data || [];
        repeaterDoldur();

    } catch (hata) {
        console.error('Lead listeleme hatasi:', hata);
        $w('#leadRepeater').data = [];
        durumYaz('Kayıtlar alınamadı. Sunucuya ulaşılamıyor olabilir, lütfen tekrar deneyin.');
    }
}


// Son cekilen kayitlari secili yonde Repeater'a basar
function repeaterDoldur() {
    if (sonKayitlar.length === 0) {
        $w('#leadRepeater').data = [];
        durumYaz('Henüz kayıtlı bir talep bulunmuyor.');
        return;
    }

    // Backend en yeniden eskiye gonderir; "eski ustte" secildiyse cevir
    const sira = yeniUstte ? sonKayitlar : sonKayitlar.slice().reverse();

    // KRITIK: Wix Repeater her nesnede STRING tipinde bir _id bekler.
    // Backend "id" (sayi) donduruyor; donusumu burada yapiyoruz ki
    // backend Wix'e ozel bir alan tasimak zorunda kalmasin.
    $w('#leadRepeater').data = sira.map((k) => ({
        _id:           String(k.id),
        isim:          k.isim,
        telefon:       k.telefon,
        projeTipi:     k.proje_tipi,
        mesajKisa:     kisalt(k.mesaj, 90),
        tarihGosterim: tarihBicimle(k.tarih)
    }));

    durumYaz(sonKayitlar.length + ' kayıt listeleniyor.');
}


/* --- Yardimci fonksiyonlar --- */

// Uzun mesajlarin satiri bozmasini engeller
function kisalt(metin, sinir) {
    if (!metin) return '-';
    return metin.length > sinir ? metin.slice(0, sinir) + '…' : metin;
}

// "2026-08-28 22:38:47" -> "28.08.2026 22:38"
function tarihBicimle(ham) {
    if (!ham) return '-';
    const p = ham.split(' ');
    const g = (p[0] || '').split('-');   // [yil, ay, gun]
    const s = (p[1] || '').split(':');   // [saat, dakika, saniye]
    if (g.length !== 3) return ham;
    const saat = s.length >= 2 ? ' ' + s[0] + ':' + s[1] : '';
    return g[2] + '.' + g[1] + '.' + g[0] + saat;
}

// #textDurum sayfada yoksa sessizce gec; durum mesaji her halukarda
// konsola yazilir ki tarayici konsolundan teshis yapilabilsin.
function durumYaz(mesaj) {
    console.log('[Yonetim Paneli]', mesaj);
    try {
        $w('#textDurum').text = mesaj;
    } catch (e) {
        // #textDurum eklenmemis - sorun degil
    }
}
