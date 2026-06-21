// lang.js
const translations = {
    tr: {
        tabDashboard: "Sürücü & Paylaşım",
        tabBlog: "Geliştirici Blog",
        tabChat: "Sohbet Odaları",
        tabHelp: "Yardım Forumu",
        tabPrivacy: "Gizlilik Politikası",
        tabVip: "VIP Üyelik",
        tabAuth: "Giriş Yap",
        tabAdmin: "Yönetim",
        createFolderTitle: "Yeni Klasör Oluştur",
        addLinkTitle: "Klasöre Bağlantı Ekle",
        cloudStorageTitle: "Bulut Depolama Modülü",
        savedFilesTitle: "Özel Sürücü Alanı",
        globalFilesTitle: "Ortak Paylaşılan Küresel Dosyalar",
        globalSharedTitle: "Ortak Paylaşılan Küresel Klasörler",
        myDriverTitle: "CoreBase Sürücüm",
        globalChatTitle: "Genel Sohbet Kanalı",
        urlChatTitle: "URL Tartışma Odası",
        helpPanelTitle: "Topluluğa Teknik Soru Sor",
        vipActivationTitle: "VIP Aktivasyon Modülü",
        adminPanelTitle: "Rütbe Yönetim Merkezi",
        settingsTitle: "Profil & Hesap Ayarları",
        // Input ve Placeholder Alanları
        newFolderNameInput: "Klasör Adı",
        siteNameInput: "Bağlantı Başlığı",
        siteUrlInput: "URL Adresi",
        newFileName: "dosya_adi",
        newFileContent: "İçeriği buraya girin...",
        blogTitleInput: "Makale Başlığı...",
        blogContentInput: "Makale içeriğini yazın...",
        globalMsgInput: "Mesajınız...",
        urlChatTarget: "Web adresi (URL) girin...",
        urlMsgInput: "Mesajınız...",
        helpTitleInput: "Karşılaştığınız teknik problem nedir?",
        changeNickInput: "Yeni kullanıcı adı..."
    },
    en: {
        tabDashboard: "Drive & Share",
        tabBlog: "Developer Blog",
        tabChat: "Chat Rooms",
        tabHelp: "Help Forum",
        tabPrivacy: "Privacy Policy",
        tabVip: "VIP Membership",
        tabAuth: "Login",
        tabAdmin: "Management",
        createFolderTitle: "Create New Folder",
        addLinkTitle: "Add Link to Folder",
        cloudStorageTitle: "Cloud Storage Module",
        savedFilesTitle: "Private Drive Area",
        globalFilesTitle: "Globally Shared Files",
        globalSharedTitle: "Globally Shared Folders",
        myDriverTitle: "My CoreBase Drive",
        globalChatTitle: "General Chat Channel",
        urlChatTitle: "URL Discussion Room",
        helpPanelTitle: "Ask Technical Questions to Community",
        vipActivationTitle: "VIP Activation Module",
        adminPanelTitle: "Rank Management Center",
        settingsTitle: "Profile & Account Settings",
        // Input and Placeholder Fields
        newFolderNameInput: "Folder Name",
        siteNameInput: "Link Title",
        siteUrlInput: "URL Address",
        newFileName: "file_name",
        newFileContent: "Enter content here...",
        blogTitleInput: "Article Title...",
        blogContentInput: "Write article content...",
        globalMsgInput: "Your message...",
        urlChatTarget: "Enter web address (URL)...",
        urlMsgInput: "Your message...",
        helpTitleInput: "What is the technical problem you face?",
        changeNickInput: "New username..."
    }
};

window.translateUI = function(lang) {
    const dict = translations[lang] || translations['tr'];
    
    // Tüm metin elementlerini kimliklerine göre çevir
    Object.keys(dict).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Element bir input veya textarea ise placeholder alanını değiştir
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = dict[id];
            } else {
                // Normal element ise iç metni değiştir
                el.innerText = dict[id];
            }
        }
    });
};

// İlk yüklemede yerel hafızadaki dili kontrol et ve uygula
document.addEventListener("DOMContentLoaded", () => {
    const activeLang = localStorage.getItem('corebase_lang') || 'tr';
    window.translateUI(activeLang);
});
