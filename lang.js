// lang.js
const translations = {
    tr: {
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
    
    Object.keys(dict).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = dict[id];
            }
        }
    });
};

document.addEventListener("DOMContentLoaded", () => {
    const activeLang = localStorage.getItem('corebase_lang') || 'tr';
    window.translateUI(activeLang);
});
