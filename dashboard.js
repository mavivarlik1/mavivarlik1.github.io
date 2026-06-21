// dashboard.js
export function initDashboard(db, user, fsTools) {
    const { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot } = fsTools;
    const userDocRef = doc(db, "users", user.uid);

    let localPrivateFolders = {};
    let localGlobalFolders = [];

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

    const qGlobalFolders = query(collection(db, "global_folders"), orderBy("createdAt", "desc"));
    onSnapshot(qGlobalFolders, (snapshot) => {
        localGlobalFolders = [];
        snapshot.forEach(docSnap => {
            localGlobalFolders.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderGlobalFolders(localGlobalFolders);
        refreshFolderSelect();
    });

    window.createNewFolder = async function() {
        const name = document.getElementById('newFolderNameInput').value.trim();
        if(!name) return alert("Lütfen klasör adını boş bırakmayın.");
        
        const typeSelect = document.getElementById('folderTypeSelect');
        const isGlobal = typeSelect ? typeSelect.value === 'global' : false;

        if (isGlobal) {
            try {
                await addDoc(collection(db, "global_folders"), {
                    name: name,
                    links: [],
                    createdAt: Date.now(),
                    creator: user.nick
                });
                document.getElementById('newFolderNameInput').value = '';
                alert("Küresel paylaşılan klasör başarıyla oluşturuldu.");
            } catch(e) { alert("Klasör oluşturulamadı: " + e.message); }
        } else {
            const id = 'folder_' + Date.now();
            try {
                await updateDoc(userDocRef, { [`folders.${id}`]: { name: name, links: [] } });
                document.getElementById('newFolderNameInput').value = '';
                alert("Özel klasör sürücünüze başarıyla eklendi.");
            } catch(e) { alert("Klasör hatası: " + e.message); }
        }
    };

    window.addNewLinkToFolder = async function() {
        const fullId = document.getElementById('folderSelect').value;
        const sName = document.getElementById('siteNameInput').value.trim();
        let sUrl = document.getElementById('siteUrlInput').value.trim();
        
        if(!fullId || !sName || !sUrl) return alert("Lütfen tüm alanları doldurun.");
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
                    alert("Bağlantı başarıyla küresel paylaşılan klasöre eklendi.");
                }
            } catch(e) { alert("Bağlantı ekleme hatası: " + e.message); }
        } else {
            try {
                const snap = await getDoc(userDocRef);
                if(snap.exists()) {
                    let currentLinks = snap.data().folders[targetId].links || [];
                    currentLinks.push({ name: sName, url: sUrl });
                    await updateDoc(userDocRef, { [`folders.${targetId}.links`]: currentLinks });
                    document.getElementById('siteNameInput').value = '';
                    document.getElementById('siteUrlInput').value = '';
                    alert("Bağlantı özel klasörünüze eklendi.");
                }
            } catch(e) { alert("Bağlantı hatası: " + e.message); }
        }
    };

    window.createNewTextFile = async function() {
        const name = document.getElementById('newFileName').value.trim();
        const content = document.getElementById('newFileContent').value.trim();
        if(!name || !content) return alert("Lütfen dosya adı ve içeriği girin.");
        
        try {
            const snap = await getDoc(userDocRef);
            if(snap.exists()) {
                let files = snap.data().files || [];
                files.push({ name: name.endsWith('.txt') ? name : name + '.txt', content: content, type: 'text' });
                await updateDoc(userDocRef, { files: files });
                document.getElementById('newFileName').value = '';
                document.getElementById('newFileContent').value = '';
                alert("Metin belgesi sürücünüze güvenle kaydedildi.");
            }
        } catch(e) { alert("Dosya oluşturma hatası: " + e.message); }
    };

    function refreshFolderSelect() {
        const select = document.getElementById('folderSelect');
        if(!select) return;
        select.innerHTML = '<option value="">-- Klasör Seçin --</option>';
        
        for (const [id, f] of Object.entries(localPrivateFolders)) {
            select.innerHTML += `<option value="private_${id}">🔒 [Özel] ${f.name}</option>`;
        }
        localGlobalFolders.forEach(f => {
            select.innerHTML += `<option value="global_${f.id}">🌍 [Paylaşılan] ${f.name}</option>`;
        });
    }

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

    // 🛡️ AKTİF EDİLMİŞ DOSYA ÖNİZLEME MOTORU
    window.viewFileContent = function(name, content) {
        const modal = document.getElementById('fileViewerModal');
        const title = document.getElementById('viewerTitle');
        const body = document.getElementById('viewerBody');
        if(!modal || !title || !body) return;

        title.innerText = "📄 " + name;
        body.innerHTML = `<textarea class="viewer-text" readonly style="width:100%; height:350px; background:#0f172a; color:#a7f3d0; border:none; font-family:monospace; padding:15px; box-sizing:border-box; border-radius:8px;">${content}</textarea>`;
        modal.classList.remove('hidden');
    };

    window.closeFileViewer = function() {
        const modal = document.getElementById('fileViewerModal');
        if(modal) modal.classList.add('hidden');
    };

    function renderPrivateFiles(files) {
        const wrapper = document.getElementById('fileStorageWrapper');
        if(!wrapper) return;
        wrapper.innerHTML = '';
        files.forEach((f) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            
            let safeName = f.name.replace(/'/g, "\\'");
            let safeContent = f.content.replace(/'/g, "\\'").replace(/\n/g, "\\n");

            div.innerHTML = `
                <div style="font-weight:600; color:var(--accent-color);">📄 ${f.name}</div>
                <button onclick="window.viewFileContent('${safeName}', '${safeContent}')" style="padding:6px; font-size:12px;">Görüntüle</button>
            `;
            wrapper.appendChild(div);
        });
    }
}
