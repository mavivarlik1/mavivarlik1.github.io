// dashboard.js
export function initDashboard(db, user, fsTools) {
    const { doc, setDoc, getDoc, updateDoc, onSnapshot } = fsTools;
    const userDocRef = doc(db, "users", user.uid);

    // 🔄 Evrensel Canlı Dinleyici (Herkes için Firestore Bağlantısı)
    const unsub = onSnapshot(userDocRef, (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            renderPrivateFolders(data.folders || {});
            renderPrivateFiles(data.files || []);
            updateFolderSelect(data.folders || {});
        } else {
            // Eğer veritabanında dökümanı yoksa otomatik şablon oluştur (Hesabı kalıcı yap)
            setDoc(userDocRef, { 
                email: user.email, 
                points: 0, 
                role: user.role || "user", 
                folders: {}, 
                files: [],
                nick: user.nick
            });
        }
    });

    // 📂 Yeni Klasör Yaratma
    window.createNewFolder = async function() {
        const name = document.getElementById('newFolderNameInput').value.trim();
        if(!name) return alert("Klasör ismi boş olamaz!");
        const id = 'folder_' + Date.now();
        try {
            await updateDoc(userDocRef, { [`folders.${id}`]: { name: name, links: [] } });
            document.getElementById('newFolderNameInput').value = '';
        } catch(e) { alert("Klasör yaratma hatası: " + e.message); }
    };

    // 📌 Klasöre Link Ekleme
    window.addNewLinkToFolder = async function() {
        const fId = document.getElementById('folderSelect').value;
        const sName = document.getElementById('siteNameInput').value.trim();
        let sUrl = document.getElementById('siteUrlInput').value.trim();
        
        if(!fId || !sName || !sUrl) return alert("Lütfen tüm alanları doldurun!");
        if(!sUrl.startsWith('http')) sUrl = 'https://' + sUrl;

        try {
            const snap = await getDoc(userDocRef);
            if(snap.exists()) {
                let currentLinks = snap.data().folders[fId].links || [];
                currentLinks.push({ name: sName, url: sUrl });
                await updateDoc(userDocRef, { [`folders.${fId}.links`]: currentLinks });
                document.getElementById('siteNameInput').value = '';
                document.getElementById('siteUrlInput').value = '';
            }
        } catch(e) { alert("Link ekleme hatası: " + e.message); }
    };

    // 📄 Metin Dosyası Oluşturma
    window.createNewTextFile = async function() {
        const name = document.getElementById('newFileName').value.trim();
        const content = document.getElementById('newFileContent').value.trim();
        if(!name || !content) return alert("İsim ve içerik girin!");
        
        try {
            const snap = await getDoc(userDocRef);
            if(snap.exists()) {
                let files = snap.data().files || [];
                files.push({ name: name.endsWith('.txt') ? name : name + '.txt', content: content, type: 'text' });
                await updateDoc(userDocRef, { files: files });
                document.getElementById('newFileName').value = '';
                document.getElementById('newFileContent').value = '';
            }
        } catch(e) { alert("Dosya oluşturma hatası: " + e.message); }
    };

    // 🔄 Arayüz Çizim Fonksiyonları
    function renderPrivateFolders(folders) {
        const wrapper = document.getElementById('foldersWrapper');
        if(!wrapper) return;
        wrapper.innerHTML = '';
        for (const [id, f] of Object.entries(folders)) {
            const div = document.createElement('div');
            div.className = 'folder-section';
            let linksHtml = '';
            if(f.links) f.links.forEach(l => { linksHtml += `<div class="link-card" onclick="window.open('${l.url}', '_blank')">🔗 ${l.name}</div>`; });
            div.innerHTML = `<div class="folder-title">📂 ${f.name}</div><div class="links-container">${linksHtml}</div>`;
            wrapper.appendChild(div);
        }
    }

    function renderPrivateFiles(files) {
        const wrapper = document.getElementById('fileStorageWrapper');
        if(!wrapper) return;
        wrapper.innerHTML = '';
        files.forEach((f, index) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<div style="font-weight:600; color:var(--accent-color);">📄 ${f.name}</div><button onclick="alert('Bulut önizleme yakında eklenecek!')" style="padding:6px; font-size:12px;">Görüntüle</button>`;
            wrapper.appendChild(div);
        });
    }

    function updateFolderSelect(folders) {
        const select = document.getElementById('folderSelect');
        if(!select) return;
        select.innerHTML = '<option value="">-- Klasör Seç --</option>';
        for (const [id, f] of Object.entries(folders)) {
            select.innerHTML += `<option value="${id}">${f.name}</option>`;
        }
    }
}
