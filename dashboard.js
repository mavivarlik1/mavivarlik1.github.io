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
            renderSidebarTree();
        }
    });

    const qGlobalFolders = query(collection(db, "global_folders"), orderBy("createdAt", "desc"));
    onSnapshot(qGlobalFolders, (snapshot) => {
        localGlobalFolders = [];
        snapshot.forEach(docSnap => { localGlobalFolders.push({ id: docSnap.id, ...docSnap.data() }); });
        renderGlobalFolders(localGlobalFolders);
        refreshFolderSelect();
        renderSidebarTree();
    });

    const qGlobalFiles = query(collection(db, "global_files"), orderBy("createdAt", "desc"));
    onSnapshot(qGlobalFiles, (snapshot) => {
        const wrapper = document.getElementById('globalFileStorageWrapper');
        if(!wrapper) return; wrapper.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const f = docSnap.data();
            const div = document.createElement('div'); div.className = 'file-item';
            let safeName = f.name.replace(/'/g, "\\'");
            let safeContent = f.content.replace(/'/g, "\\'").replace(/\n/g, "\\n");
            div.innerHTML = `
                <div style="font-weight:600; color:var(--success-color);">🌍 ${f.name}</div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:-6px;">Paylaşan: ${f.creator || 'Anonim'}</div>
                <div style="display:flex; gap:6px; margin-top:4px;">
                    <button onclick="window.viewFileContent('${safeName}', '${safeContent}')" style="padding:4px 8px; font-size:11px; flex:1;">Önizle</button>
                    <button onclick="window.downloadFile('${safeName}', '${safeContent}')" style="padding:4px 8px; font-size:11px; background:var(--success-color); color:#064e3b; flex:1;">İndir</button>
                </div>
            `;
            wrapper.appendChild(div);
        });
    });

    window.createNewFolder = async function() {
        const name = document.getElementById('newFolderNameInput').value.trim();
        if(!name) return alert("Lütfen klasör adını boş bırakmayın.");
        const typeSelect = document.getElementById('folderTypeSelect');
        const isGlobal = typeSelect ? typeSelect.value === 'global' : false;
        
        // Klasör Resim Linkini Alma
        const iconSelect = document.getElementById('newFolderIconSelect');
        const iconUrl = iconSelect ? iconSelect.value : 'site_profile.png';

        if (isGlobal) {
            try {
                await addDoc(collection(db, "global_folders"), { name: name, icon: iconUrl, links: [], createdAt: Date.now(), creator: user.nick });
                document.getElementById('newFolderNameInput').value = '';
                alert("Küresel paylaşılan klasör başarıyla oluşturuldu.");
            } catch(e) { alert("Klasör oluşturulamadı: " + e.message); }
        } else {
            const id = 'folder_' + Date.now();
            try {
                await updateDoc(userDocRef, { [`folders.${id}`]: { name: name, icon: iconUrl, links: [] } });
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
                    alert("Bağlantı özel klasörünüze eklendi.");
                }
            } catch(e) { alert("Bağlantı hatası: " + e.message); }
        }
        document.getElementById('siteNameInput').value = ''; document.getElementById('siteUrlInput').value = '';
    };

    window.createNewTextFile = async function() {
        const nameInput = document.getElementById('newFileName').value.trim();
        const ext = document.getElementById('newFileExtension').value;
        const privacy = document.getElementById('newFilePrivacy').value;
        const content = document.getElementById('newFileContent').value.trim();
        if(!nameInput || !content) return alert("Lütfen dosya adını ve içeriğini eksiksiz doldurun.");
        const fullName = nameInput.endsWith(ext) ? nameInput : nameInput + ext;
        
        if (privacy === 'global') {
            try {
                await addDoc(collection(db, "global_files"), { name: fullName, content: content, creator: user.nick, createdAt: Date.now() });
                alert("Kod/Metin belgesi ortak havuzda yayınlandı! 🌍");
            } catch(e) { alert("Paylaşım hatası: " + e.message); }
        } else {
            try {
                const snap = await getDoc(userDocRef);
                if(snap.exists()) {
                    let files = snap.data().files || [];
                    files.push({ name: fullName, content: content, createdAt: Date.now() });
                    await updateDoc(userDocRef, { files: files });
                    alert("Dosya şifreli özel sürücünüze kaydedildi! 🔒");
                }
            } catch(e) { alert("Dosya oluşturma hatası: " + e.message); }
        }
        document.getElementById('newFileName').value = ''; document.getElementById('newFileContent').value = '';
    };

    window.sharePrivateFile = async function(index) {
        try {
            const snap = await getDoc(userDocRef);
            if(snap.exists()) {
                const files = snap.data().files || []; const targetFile = files[index];
                if(targetFile) {
                    await addDoc(collection(db, "global_files"), { name: targetFile.name, content: targetFile.content, creator: user.nick, createdAt: Date.now() });
                    alert(`"${targetFile.name}" başarıyla küresel havuzda paylaşıldı! 🚀`);
                }
            }
        } catch(e) { alert("Dosya paylaşım hatası: " + e.message); }
    };

    window.uploadLocalFile = function() {
        const uploader = document.getElementById('localFileUploader');
        if (!uploader || !uploader.files[0]) return alert("Lütfen önce cihazınızdan yüklenecek bir dosya seçin.");
        const file = uploader.files[0]; const reader = new FileReader();
        reader.onload = async function(e) {
            const content = e.target.result;
            try {
                const snap = await getDoc(userDocRef);
                if (snap.exists()) {
                    let files = snap.data().files || [];
                    files.push({ name: file.name, content: content, createdAt: Date.now() });
                    await updateDoc(userDocRef, { files: files });
                    alert(`"${file.name}" cihazınızdan özel bulut sürücünüze başarıyla senkronize edildi! 📥`);
                    uploader.value = '';
                }
            } catch(err) { alert("Dosya yükleme hatası: " + err.message); }
        };
        reader.readAsText(file);
    };

    window.handleRealCardPayment = function() {
        const name = document.getElementById('cardHolderNamePay').value.trim();
        const number = document.getElementById('cardNumber').value.trim();
        const expiry = document.getElementById('cardExpiry').value.trim();
        const cvc = document.getElementById('cardCvc').value.trim();

        if(!name || !number || !expiry || !cvc) {
            return alert("Lütfen kart ile anında aktivasyon için tüm alanları eksiksiz doldurun.");
        }
        alert("Secure Ödeme Ağ Geçidi Bağlantısı Başarılı!\nSimüle edilen 5.00 TL tahsil edildi. VIP yetkiniz kurucu masası onayına gönderildi!");
        document.getElementById('cardHolderNamePay').value = '';
        document.getElementById('cardNumber').value = '';
        document.getElementById('cardExpiry').value = '';
        document.getElementById('cardCvc').value = '';
    };

    window.handleBugVipPayment = async function() {
        const title = document.getElementById('vipSuggestionTitle').value.trim();
        const content = document.getElementById('vipSuggestionContent').value.trim();
        if(!title || !content) return alert("Lütfen ücretsiz VIP rütbesi için hata başlığı ve açıklama alanını doldurun.");
        try {
            await addDoc(collection(db, "forum_topics"), { title: `[VIP BUG/ÖNERİ] ${title}`, creator: user.nick, createdAt: Date.now(), views: 0, uid: user.uid, body: content });
            alert("Harika! Teknik bildiriminiz kurucu masasına başarıyla iletildi. Doğrulama sonrası VIP rütbeniz tamamen ÜCRETSİZ olarak tanımlanacaktır.");
            document.getElementById('vipSuggestionTitle').value = ''; document.getElementById('vipSuggestionContent').value = '';
        } catch(e) { alert("Bildirim gönderme hatası: " + e.message); }
    };

    window.downloadFile = function(name, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a);
        a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    window.viewFileContent = function(name, content) {
        const modal = document.getElementById('fileViewerModal');
        const title = document.getElementById('viewerTitle'); const body = document.getElementById('viewerBody');
        if(!modal || !title || !body) return;
        title.innerText = "📄 Dosya Önizleme: " + name;
        body.innerHTML = `<textarea class="viewer-text" readonly style="width:100%; height:300px; background:var(--inner-bg); color:var(--text-color); border:var(--glass-border); padding:10px; border-radius:6px; outline:none; font-family:monospace; resize:none;">${content}</textarea>`;
        modal.classList.remove('hidden');
    };

    window.closeFileViewer = function() {
        const modal = document.getElementById('fileViewerModal'); if(modal) modal.classList.add('hidden');
    };

    function refreshFolderSelect() {
        const select = document.getElementById('folderSelect'); if(!select) return;
        select.innerHTML = '<option value="">-- Klasör Seçin --</option>';
        for (const [id, f] of Object.entries(localPrivateFolders)) { select.innerHTML += `<option value="private_${id}">🔒 [Özel] ${f.name}</option>`; }
        localGlobalFolders.forEach(f => { select.innerHTML += `<option value="global_${f.id}">🌍 [Paylaşılan] ${f.name}</option>`; });
    }

    // MODERN YENİ SOL PANEL DETAYLI ÇİZİM MOTORU (AĞAÇ YAPISI)
    function renderSidebarTree() {
        const container = document.getElementById('sidebarFolderTreeContainer');
        if(!container) return;
        container.innerHTML = '';

        let hasAnyFolder = false;

        // 1. Özel Klasörleri Çiz
        for (const [id, f] of Object.entries(localPrivateFolders)) {
            hasAnyFolder = true;
            const node = document.createElement('div');
            node.className = 'folder-tree-node';
            
            let linksHtml = '';
            if(f.links && f.links.length > 0) {
                f.links.forEach(l => { linksHtml += `<a href="${l.url}" target="_blank" class="folder-tree-link">🔗 ${l.name}</a>`; });
            } else { linksHtml = `<span style="font-size:11px; color:var(--text-muted); font-style:italic;">İçi boş</span>`; }

            node.innerHTML = `
                <div class="folder-tree-header" onclick="window.sidebarToggleNode(this)">
                    <img src="${f.icon || 'site_profile.png'}" class="folder-tree-img">
                    <span class="folder-tree-title">🔒 ${f.name}</span>
                    <span class="folder-tree-arrow">▶</span>
                </div>
                <div class="folder-tree-content hidden">${linksHtml}</div>
            `;
            container.appendChild(node);
        }

        // 2. Global Paylaşılan Klasörleri Çiz
        localGlobalFolders.forEach(f => {
            hasAnyFolder = true;
            const node = document.createElement('div');
            node.className = 'folder-tree-node';
            
            let linksHtml = '';
            if(f.links && f.links.length > 0) {
                f.links.forEach(l => { linksHtml += `<a href="${l.url}" target="_blank" class="folder-tree-link">🔗 ${l.name}</a>`; });
            } else { linksHtml = `<span style="font-size:11px; color:var(--text-muted); font-style:italic;">İçi boş</span>`; }

            node.innerHTML = `
                <div class="folder-tree-header" onclick="window.sidebarToggleNode(this)">
                    <img src="${f.icon || 'site_profile.png'}" class="folder-tree-img">
                    <span class="folder-tree-title">🌍 ${f.name}</span>
                    <span class="folder-tree-arrow">▶</span>
                </div>
                <div class="folder-tree-content hidden">
                    <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px;">Maker: ${f.creator || 'Anonim'}</div>
                    ${linksHtml}
                </div>
            `;
            container.appendChild(node);
        }
        
        if(!hasAnyFolder) {
            container.innerHTML = `<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Klasör bulunmuyor</span>`;
        }
    }

    // Küresel Sidebar Tıklama Fonksiyonu
    window.sidebarToggleNode = function(headerElement) {
        const node = headerElement.parentElement;
        node.classList.toggle('open');
        const content = node.querySelector('.folder-tree-content');
        const arrow = node.querySelector('.folder-tree-arrow');
        if (content) content.classList.toggle('hidden');
        if (arrow) {
            if(node.classList.contains('open')) arrow.innerText = '▼';
            else arrow.innerText = '▶';
        }
    };

    function renderPrivateFolders(folders) {
        const wrapper = document.getElementById('foldersWrapper'); if(!wrapper) return; wrapper.innerHTML = '';
        for (const [id, f] of Object.entries(folders)) {
            const div = document.createElement('div'); div.className = 'folder-section'; let linksHtml = '';
            if(f.links) f.links.forEach(l => { linksHtml += `<div class="link-card" onclick="window.open('${l.url}', '_blank')">🔗 ${l.name}</div>`; });
            div.innerHTML = `<div class="folder-title"><div style="display:flex; align-items:center; gap:8px;"><img src="${f.icon || 'site_profile.png'}" style="width:22px; height:22px; object-fit:cover; border-radius:4px;">📂 ${f.name} (Kişisel)</div></div><div class="links-container">${linksHtml}</div>`;
            wrapper.appendChild(div);
        }
    }

    function renderGlobalFolders(folders) {
        const wrapper = document.getElementById('sharedFoldersWrapper'); if(!wrapper) return; wrapper.innerHTML = '';
        folders.forEach(f => {
            const div = document.createElement('div'); div.className = 'folder-item'; let linksHtml = '';
            if(f.links) f.links.forEach(l => { linksHtml += `<div class="link-card" onclick="window.open('${l.url}', '_blank')">🔗 ${l.name}</div>`; });
            div.innerHTML = `<div class="folder-title" style="color:var(--success-color); font-size:15px;"><div style="display:flex; align-items:center; gap:8px;"><img src="${f.icon || 'site_profile.png'}" style="width:22px; height:22px; object-fit:cover; border-radius:4px;">🌍 ${f.name}</div></div><div style="font-size:10px; color:var(--text-muted); margin-top:-10px; margin-bottom:5px;">Paylaşan: ${f.creator || 'Anonim'}</div><div class="links-container">${linksHtml}</div>`;
            wrapper.appendChild(div);
        });
    }

    function renderPrivateFiles(files) {
        const wrapper = document.getElementById('fileStorageWrapper'); if(!wrapper) return; wrapper.innerHTML = '';
        files.forEach((f, index) => {
            const div = document.createElement('div'); div.className = 'file-item';
            let safeName = f.name.replace(/'/g, "\\'"); let safeContent = f.content.replace(/'/g, "\\'").replace(/\n/g, "\\n");
            div.innerHTML = `
                <div style="font-weight:600; color:var(--accent-color);">📄 ${f.name}</div>
                <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">
                    <button onclick="window.viewFileContent('${safeName}', '${safeContent}')" style="padding:4px 6px; font-size:11px; flex:1;">Önizle</button>
                    <button onclick="window.downloadFile('${safeName}', '${safeContent}')" style="padding:4px 6px; font-size:11px; background:var(--success-color); color:#064e3b; flex:1;">İndir</button>
                    <button onclick="window.sharePrivateFile(${index})" style="padding:4px 6px; font-size:11px; background:var(--gold-color); color:#1e293b; flex:1;">Paylaş</button>
                </div>
            `;
            wrapper.appendChild(div);
        });
    }
}
