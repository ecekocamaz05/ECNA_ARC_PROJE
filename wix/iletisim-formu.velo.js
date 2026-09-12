/* =====================================================================
   ECNA ARC - ILETISIM / TALEP FORMU (Yonerge Modul G / Arayuz 1)

   Wix'in kendi Giris (Input) ogeleriyle yapilmis "Iletisim icin" kartini
   POST /api/leads'e baglar. Gonderilen her kayit yonetim panelinde gorunur.

   NEREYE YAPISTIRILIR?
   Wix Studio > Dev Mode (Velo) ACIK > formun bulundugu sayfa > alttaki
   kod paneline bu dosyanin TAMAMI.

   !!! SOHBET KARTIYLA AYNI SAYFADAYSA:
   Sayfada zaten home-chatbot.velo.js varsa, bu dosyanin EN USTTEKI
   "import { fetch } from 'wix-fetch';" satirini yapistirmayin (o satir
   zaten var). Iki kez yapistirirsaniz Wix su hatayi verir:
       "Identifier 'fetch' has already been declared"
   Bu hatayi gorurseniz sebep budur; ikinci import satirini silin.

   ---------------------------------------------------------------------
   SAYFADA BULUNMASI GEREKEN ELEMAN ID'LERI

   ZORUNLU:
     #girdiAd       -> Giris   ("Isim" kutusu)
     #girdiTelefon  -> Giris   ("Telefon numarasi" kutusu)
     #btnKaydet     -> Dugme   ("Gonder" butonu)

   OPSIYONEL (yoksa kod sessizce atlar):
     #girdiSoyad    -> Giris   ("Soyisim")
     #girdiEposta   -> Giris   ("Mail")
     #girdiNot      -> Giris veya Metin Kutusu ("Mesajiniz")
     #textFormDurum -> Metin   (butonun altina kucuk bir sonuc yazisi)

   DIKKAT - ISIM CAKISMASI:
   Sohbet kartiyla ayni sayfadaysaniz su ID'leri KULLANMAYIN, onlar
   sohbete ait: #girdiMesaj, #btnGonder. Bu yuzden buradaki mesaj kutusu
   "girdiNot", buton "btnKaydet" olarak adlandirildi.

   NEDEN HICBIR ID'DE BUYUK "I" YOK?
   Turkce klavyede Shift+i, İ (noktali) uretir; JavaScript'in bekledigi I
   (noktasiz) ile ayni karakter DEGILDIR. "girdiIsim" yerine "girdiAd".

   ---------------------------------------------------------------------
   ALAN ESLESTIRMESI (backend'in bekledigi isimler)

   Backend database.lead_ekle() su dort alani okur:
       isim, telefon, mesaj, proje_tipi
   Formda "soyisim" ve "mail" var ama tabloda bu sutunlar yok. Sema
   degistirmemek icin:
       isim  = Isim + " " + Soyisim
       mesaj = "E-posta: ..." satiri + Mesajiniz
   Boylece hicbir bilgi kaybolmaz, yonetim panelinde hepsi gorunur.
   ===================================================================== */

import { fetch } from 'wix-fetch';

// Render sunucusunun MUTLAK adresi. Goreli adres ("/api/leads") KULLANMAYIN.
const API_LEADS = 'https://ecna-arc-smartlead.onrender.com/api/leads';


$w.onReady(function () {
    $w('#btnKaydet').onClick(() => talepGonder());
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
