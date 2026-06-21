// dashboard.js
export function initDashboard(db, user, fsTools) {
    const { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot } = fsTools;
    const userDocRef = doc(db, "users", user.uid);

    let localPrivateFolders = {};
    let localGlobalFolders = [];

    // ⚡ ARAYÜZ HİLESİ: index.html'i bozmamak için klasör türü seçiciyi kodla enjekte et
    const inputEl = document.getElementById('newFolderNameInput');
    if (inputEl && !document.getElementById('folderTypeSelect')) {
        const select = document.createElement('select');
        select.id = 'folderTypeSelect';
        select.style.margin = '8px 0';
        select.style.background = 'rgba(15, 23, 42, 0.8)';
        select.style.color = 'var(--text-color)';
        select.style.border = '1px solid rgba(255,255,255,0.1)';
        select.style.padding = '10px';
        select.style.borderRadius = '8px';
        select.innerHTML = `
            <option value="private">🔒 Özel Klasör (Sadece Benim Sürücüm)</option>
            <option value="global">🌍 Global Klasör (Ortak Paylaşılan Alan)</option>
        `;
        inputEl.parentNode.insertBefore(select, inputEl);
    }

    // 🔒 1. DİNLEYİCİ: Kullanıcının Kendine Özel Sürücüsünü Dinle
    onSnapshot(userDocRef, (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            localPrivateFolders = data.folders || {};
            renderPrivateFolders(localPrivateFolders);
            renderPrivateFiles(data.files || []);
            refreshFolderSelect();
        } else {
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

    // 🌍 2. DİNLEYİCİ: Küresel Paylaşılan Klasör Havuzunu Dinle
    const qGlobalFolders = query(collection(db, "global_folders"), orderBy("createdAt", "desc"));
    onSnapshot(qGlobalFolders, (snapshot) => {
        localGlobalFolders = [];
        snapshot.forEach(docSnap => {
            localGlobalFolders.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderGlobalFolders(localGlobalFolders);
        refreshFolderSelect();
    });

    // 📂 YENİ KLASÖR YARATMA MOTORU (Özel veya Global Süzgeci)
    window.createNewFolder = async function() {
        const name = document.getElementById('newFolderNameInput').value.trim();
        if(!name) return alert("Klasör ismi boş olamaz!");
        
        const typeSelect = document.getElementById('folderTypeSelect');
        const isGlobal = typeSelect ? typeSelect.value === 'global' : false;

        if (isGlobal) {
            // Herkesin görebileceği global koleksiyona yaz
            try {
                await addDoc(collection(db, "global_folders"), {
                    name: name,
                    links: [],
                    createdAt: Date.now(),
                    creator: user.nick
                });
                document.getElementById('newFolderNameInput').value = '';
                alert("Mavi varlık, global paylaşılan klasör havuzda aktif! 🌍");
            } catch(e) { alert("Global klasör oluşturulamadı: " + e.message); }
        } else {
            // Sadece kişisel dökümana yaz
            const id = 'folder_' + Date.now();
            try {
                await updateDoc(userDocRef, { [`folders.${id}`]: { name: name, links: [] } });
                document.getElementById('newFolderNameInput').value = '';
                alert("Özel klasör sürücüne eklendi! 🔒");
            } catch(e) { alert("Özel klasör hatası: " + e.message); }
        }
    };

    // 📌 LİNK EKLEME MOTORU (Özel veya Global Akıllı Yönlendirici)
    window.addNewLinkToFolder = async function() {
        const fullId = document.getElementById('folderSelect').value;
        const sName = document.getElementById('siteNameInput').value.trim();
        let sUrl = document.getElementById('siteUrlInput').value.trim();
        
        if(!fullId || !sName || !sUrl) return alert("Lütfen tüm alanları doldurun!");
        if(!sUrl.startsWith('http')) sUrl = 'https://' + sUrl;

        const isTargetGlobal = fullId.startsWith('global_');
        const targetId = fullId.replace('private_', '').replace('global_', '');

        if (isTargetGlobal) {
            try {
                const folderRef = doc(db, "global_folders", targetId);
                const folderSnap = await getDoc(folderRef);
                if (folderSnap.exists()) {
                    let currentLinks = folderSnap.data().links || [];
                    currentLinks.push({ name: sName, url: sUrl });
                    await updateDoc(folderRef, { links: currentLinks });
                    document.getElementById('siteNameInput').value = '';
                    document.getElementById('siteUrlInput').value = '';
                    alert("Link başarıyla küresel paylaşılan klasöre gömüldü! 🌍");
                }
            } catch(e) { alert("Global link ekleme hatası: " + e.message); }
        } else {
            try {
                const snap = await getDoc(userDocRef);
                if(snap.exists()) {
                    let currentLinks = snap.data().folders[targetId].links || [];
                    currentLinks.push({ name: sName, url: sUrl });
                    await updateDoc(userDocRef, { [`folders.${targetId}.links`]: currentLinks });
                    document.getElementById('siteNameInput').value = '';
                    document.getElementById('siteUrlInput').value = '';
                    alert("Link özel klasörüne eklendi! 🔒");
                }
            } catch(e) { alert("Özel link hatası: " + e.message); }
        }
    };

    // 📄 KİŞİSEL METİN DOSYASI OLUŞTURMA
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
                alert("Metin belgesi sürücüne kaydedildi! 📄");
            }
        } catch(e) { alert("Dosya oluşturma hatası: " + e.message); }
    };

    // 🎨 SEÇİM KUTUSUNU BİRLEŞTİREREK YENİLE (Özel ve Global Ayrımı)
    function refreshFolderSelect() {
        const select = document.getElementById('folderSelect');
        if(!select) return;
        select.innerHTML = '<option value="">-- Klasör Seç --</option>';
        
        // Kişisel klasörleri ata
        for (const [id, f] of Object.entries(localPrivateFolders)) {
            select.innerHTML += `<option value="private_${id}">🔒 [Özel] ${f.name}</option>`;
        }
        // Küresel klasörleri ata
        localGlobalFolders.forEach(f => {
            select.innerHTML += `<option value="global_${f.id}">🌍 [Paylaşılan] ${f.name}</option>`;
        });
    }

    // 🎨 ÖZEL SÜRÜCÜYÜ EKRANA ÇİZ
    function renderPrivateFolders(folders) {
        const wrapper = document.getElementById('foldersWrapper');
        if(!wrapper) return;
        wrapper.innerHTML = '';
        for (const [id, f] of Object.entries(folders)) {
            const div = document.createElement('div');
            div.className = 'folder-section';
            let linksHtml = '';
            if(f.links) f.links.forEach(l => { linksHtml += `<div class="link-card" onclick="window.open('${l.url}', '_blank')">🔗 ${l.name}</div>`; });
            div.innerHTML = `<div class="folder-title">📂 ${f.name} (Kişisel)</div><div class="links-container">${linksHtml}</div>`;
            wrapper.appendChild(div);
        }
    }

    // 🎨 KÜRESEL PAYLAŞILAN SÜRÜCÜYÜ EKRANA ÇİZ (VİTRİN KİLİDİ KIRILDI!)
    function renderGlobalFolders(folders) {
        const wrapper = document.getElementById('sharedFoldersWrapper');
        if(!wrapper) return;
        wrapper.innerHTML = '';
        folders.forEach(f => {
            const div = document.createElement('div');
            div.className = 'folder-item';
            let linksHtml = '';
            if(f.links) f.links.forEach(l => { linksHtml += `<div class="link-card" onclick="window.open('${l.url}', '_blank')">🔗 ${l.name}</div>`; });
            div.innerHTML = `
                <div class="folder-title" style="color: var(--success-color); font-size:15px;">🌍 ${f.name}</div>
                <div style="font-size:10px; color: var(--text-muted); margin-top:-10px; margin-bottom:5px;">Paylaşan: ${f.creator || 'Anonim'}</div>
                <div class="links-container">${linksHtml}</div>
            `;
            wrapper.appendChild(div);
        });
    }

    function renderPrivateFiles(files) {
        const wrapper = document.getElementById('fileStorageWrapper');
        if(!wrapper) return;
        wrapper.innerHTML = '';
        files.forEach((f) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<div style="font-weight:600; color:var(--accent-color);">📄 ${f.name}</div><button onclick="alert('Bulut şifreli dosya önizleme motoru yakında aktif!')" style="padding:6px; font-size:12px;">Görüntüle</button>`;
            wrapper.appendChild(div);
        });
    }
}
