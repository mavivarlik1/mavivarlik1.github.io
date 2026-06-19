let db, user, fsTools;
let userData = { folders: {}, files: [], points: 0, role: "user" };
let guestData = { folders: {}, files: [] };

export async function initDashboard(database, currentUser, firestoreTools) {
    db = database; user = currentUser; fsTools = firestoreTools;
    if(!user.isGuest) {
        await loadUserData();
    } else {
        loadGuestData();
    }
    listenSharedFolders();
}

async function loadUserData() {
    const docSnap = await fsTools.getDoc(fsTools.doc(db, "users", user.uid));
    if(docSnap.exists()) {
        userData = docSnap.data();
        if(!userData.folders) userData.folders = {};
        if(!userData.files) userData.files = [];
        if(!userData.points) userData.points = 0;
    }
    renderUI();
    renderFilesUI();
}

function loadGuestData() {
    const local = localStorage.getItem('webspace_guest_data');
    guestData = local ? JSON.parse(local) : { folders: {}, files: [] };
    if(!guestData.folders) guestData.folders = {};
    if(!guestData.files) guestData.files = [];
    renderGuestUI();
    renderGuestFilesUI();
}

async function saveToFirebase() {
    if(!user.isGuest) await fsTools.setDoc(fsTools.doc(db, "users", user.uid), userData);
}

function saveGuestToLocalStorage() {
    localStorage.setItem('webspace_guest_data', JSON.stringify(guestData));
}

// KAYITLI ÜYE FONKSİYONLARI (Firestore)
window.createNewFolder = async () => {
    if(user.isGuest) return;
    const name = document.getElementById('newFolderNameInput').value.trim();
    if(!name || userData.folders[name]) return alert("İsim geçersiz veya mevcut!");
    userData.folders[name] = [];
    await saveToFirebase();
    document.getElementById('newFolderNameInput').value = '';
    renderUI();
    window.triggerMaskot('folder_add');
};

window.addNewLinkToFolder = async () => {
    if(user.isGuest) return;
    const folder = document.getElementById('folderSelect').value;
    const name = document.getElementById('siteNameInput').value.trim();
    let url = document.getElementById('siteUrlInput').value.trim();
    if(!folder || !name || !url) return;
    if(!url.startsWith('http')) url = 'https://' + url;
    userData.folders[folder].push({ name, url });
    await saveToFirebase();
    document.getElementById('siteNameInput').value = ''; document.getElementById('siteUrlInput').value = '';
    renderUI();
};

window.shareFolderGlobal = async (folderName) => {
    if(user.isGuest) return;
    try {
        await fsTools.addDoc(fsTools.collection(db, "shared_folders"), {
            folderName: folderName, links: userData.folders[folderName], ownerUid: user.uid, ownerNick: user.nick, likes: 0, likedBy: []
        });
        alert(`"${folderName}" klasörü global vitrinde paylaşıldı! (0 Puan)`);
    } catch(e) { alert(e.message); }
};

window.createNewTextFile = async () => {
    if(user.isGuest) return;
    const name = document.getElementById('newFileName').value.trim();
    const content = document.getElementById('newFileContent').value;
    if(!name) return alert("Ad girin!");
    const base64 = btoa(unescape(encodeURIComponent(content)));
    userData.files.push({ name, size: content.length + " bytes", data: "data:text/plain;base64," + base64 });
    await saveToFirebase();
    document.getElementById('newFileName').value = ''; document.getElementById('newFileContent').value = '';
    renderFilesUI();
};

window.uploadLocalFile = () => {
    if(user.isGuest) return;
    const input = document.getElementById('localFileUploader'); if(!input.files.length) return;
    const file = input.files[0], reader = new FileReader();
    reader.onload = async (e) => {
        userData.files.push({ name: file.name, size: (file.size/1024).toFixed(2) + " KB", data: e.target.result });
        await saveToFirebase(); input.value = ''; renderFilesUI();
    };
    reader.readAsDataURL(file);
};

window.deleteStoredFile = async (index) => {
    if(confirm("Silinsin mi?")) { userData.files.splice(index, 1); await saveToFirebase(); renderFilesUI(); }
};

window.deleteFolder = async (folderName) => {
    if(confirm("Silinsin mi?")) { delete userData.folders[folderName]; await saveToFirebase(); renderUI(); }
};

// MİSAFİR USER FONKSİYONLARI (LocalStorage)
window.createGuestFolder = () => {
    const name = document.getElementById('guestNewFolderNameInput').value.trim();
    if(!name || guestData.folders[name]) return alert("İsim geçersiz veya mevcut!");
    guestData.folders[name] = [];
    saveGuestToLocalStorage();
    document.getElementById('guestNewFolderNameInput').value = '';
    renderGuestUI();
    window.triggerMaskot('folder_add');
};

window.addGuestLinkToFolder = () => {
    const folder = document.getElementById('guestFolderSelect').value;
    const name = document.getElementById('guestSiteNameInput').value.trim();
    let url = document.getElementById('guestSiteUrlInput').value.trim();
    if(!folder || !name || !url) return;
    if(!url.startsWith('http')) url = 'https://' + url;
    guestData.folders[folder].push({ name, url });
    saveGuestToLocalStorage();
    document.getElementById('guestSiteNameInput').value = ''; document.getElementById('guestSiteUrlInput').value = '';
    renderGuestUI();
};

window.createGuestTextFile = () => {
    const name = document.getElementById('guestNewFileName').value.trim();
    const content = document.getElementById('guestNewFileContent').value;
    if(!name) return alert("Ad girin!");
    const base64 = btoa(unescape(encodeURIComponent(content)));
    guestData.files.push({ name, size: content.length + " bytes", data: "data:text/plain;base64," + base64 });
    saveGuestToLocalStorage();
    document.getElementById('guestNewFileName').value = ''; document.getElementById('guestNewFileContent').value = '';
    renderGuestFilesUI();
};

window.uploadGuestLocalFile = () => {
    const input = document.getElementById('guestLocalFileUploader'); if(!input.files.length) return;
    const file = input.files[0], reader = new FileReader();
    reader.onload = (e) => {
        guestData.files.push({ name: file.name, size: (file.size/1024).toFixed(2) + " KB", data: e.target.result });
        saveGuestToLocalStorage(); input.value = ''; renderGuestFilesUI();
    };
    reader.readAsDataURL(file);
};

window.deleteGuestFolder = (folderName) => {
    if(confirm("Klasör silinsin mi?")) { delete guestData.folders[folderName]; saveGuestToLocalStorage(); renderGuestUI(); }
};

window.deleteGuestStoredFile = (index) => {
    if(confirm("Dosya silinsin mi?")) { guestData.files.splice(index, 1); saveGuestToLocalStorage(); renderGuestFilesUI(); }
};

// GLOBAL LİKE MOTORU (+5 PUAN)
window.likeSharedFolder = async (docId, ownerUid) => {
    if(user.isGuest) return alert("Beğenmek için giriş yapmalısınız!");
    if(user.uid === ownerUid) return alert("Kendi klasörünüzü beğenemezsiniz!");
    try {
        const docRef = fsTools.doc(db, "shared_folders", docId);
        const docSnap = await fsTools.getDoc(docRef);
        if(docSnap.exists()) {
            let data = docSnap.data();
            if(data.likedBy && data.likedBy.includes(user.uid)) return alert("Zaten beğendiniz!");
            let currentLikedBy = data.likedBy || []; currentLikedBy.push(user.uid);
            await fsTools.updateDoc(docRef, { likes: (data.likes || 0) + 1, likedBy: currentLikedBy });
            
            const ownerRef = fsTools.doc(db, "users", ownerUid);
            const ownerSnap = await fsTools.getDoc(ownerRef);
            if(ownerSnap.exists()) { await fsTools.updateDoc(ownerRef, { points: (ownerSnap.data().points || 0) + 5 }); }
            alert("Beğenildi! Klasör sahibine +5 Puan kazandırıldı.");
        }
    } catch(e) { alert(e.message); }
};

window.viewFile = (index) => { window.openFileEngine(user.isGuest ? guestData.files[index] : userData.files[index]); };
window.viewGuestFile = (index) => { window.openFileEngine(guestData.files[index]); };

window.openFileEngine = (file) => {
    const body = document.getElementById('viewerBody'); document.getElementById('viewerTitle').innerText = file.name; body.innerHTML = '';
    if (file.data.startsWith('data:image/')) body.innerHTML = `<img src="${file.data}" class="viewer-img">`;
    else {
        try {
            const txt = decodeURIComponent(escape(atob(file.data.split(',')[1])));
            body.innerHTML = `<textarea class="viewer-text" readonly>${txt}</textarea>`;
        } catch (e) { body.innerHTML = '<p style="color:var(--danger-color)">Açılamadı.</p>'; }
    }
    document.getElementById('fileViewerModal').classList.remove('hidden');
};

window.closeFileViewer = () => document.getElementById('fileViewerModal').classList.add('hidden');

function listenSharedFolders() {
    fsTools.onSnapshot(fsTools.query(fsTools.collection(db, "shared_folders")), (snapshot) => {
        const w = document.getElementById('sharedFoldersWrapper'), gw = document.getElementById('guestSharedFoldersWrapper');
        let html = '';
        snapshot.forEach(docSnap => {
            let d = docSnap.data();
            let linksHtml = d.links.map(l => `<div style="font-size:12px; color:var(--accent-color); cursor:pointer;" onclick="window.open('${l.url}','_blank')">🔗 ${l.name}</div>`).join('');
            html += `<div class="folder-item"><div><h4 style="margin:0; color:white;">📁 ${d.folderName}</h4><span style="font-size:10px; color:var(--text-muted);">Paylaşan: ${d.ownerNick || 'Bilinmiyor'}</span><div style="margin-top:10px; display:flex; flex-direction:column; gap:4px;">${linksHtml}</div></div><button onclick="likeSharedFolder('${docSnap.id}', '${d.ownerUid}')" style="background:#312e81; color:white; font-size:12px; padding:6px; margin:0; width:100%;">👍 Beğen (${d.likes || 0})</button></div>`;
        });
        if(w) w.innerHTML = html; if(gw) gw.innerHTML = html;
    });
}

function renderFilesUI() {
    const w = document.getElementById('fileStorageWrapper'); w.innerHTML = '';
    if(!userData.files.length) return w.innerHTML = '<p style="color:var(--text-muted); font-size:13px; grid-column:1/-1;">Bulutta dosya bulunmuyor.</p>';
    userData.files.forEach((f, i) => {
        w.innerHTML += `<div class="file-item"><div><div class="file-info">📄 ${f.name}</div><div class="file-size">${f.size}</div></div><div style="display:flex; gap:5px;"><button onclick="viewFile(${i})" style="flex:1; padding:5px; font-size:11px;">👁️ Aç</button><button onclick="deleteStoredFile(${i})" style="background:var(--danger-color); color:white; padding:5px; margin:0; font-size:11px;">Sil</button></div></div>`;
    });
}

function renderGuestFilesUI() {
    const w = document.getElementById('guestFileStorageWrapper'); w.innerHTML = '';
    if(!guestData.files.length) return w.innerHTML = '<p style="color:var(--text-muted); font-size:13px; grid-column:1/-1;">Yerelde dosya bulunmuyor.</p>';
    guestData.files.forEach((f, i) => {
        w.innerHTML += `<div class="file-item"><div><div class="file-info">📄 ${f.name}</div><div class="file-size">${f.size}</div></div><div style="display:flex; gap:5px;"><button onclick="viewGuestFile(${i})" style="flex:1; padding:5px; font-size:11px;">👁️ Aç</button><button onclick="deleteGuestStoredFile(${i})" style="background:var(--danger-color); color:white; padding:5px; margin:0; font-size:11px;">Sil</button></div></div>`;
    });
}

function renderUI() {
    const w = document.getElementById('foldersWrapper'); w.innerHTML = '';
    const s = document.getElementById('folderSelect'); s.innerHTML = '<option value="">-- Klasör Seç --</option>';
    for (let f in userData.folders) {
        s.innerHTML += `<option value="${f}">${f}</option>`;
        let fDiv = document.createElement('div'); fDiv.className = 'folder-section';
        fDiv.innerHTML = `<div class="folder-title"><span>📂 ${f}</span><div style="display:flex; gap:5px;"><button onclick="shareFolderGlobal('${f}')" style="background:var(--accent-color); color:#0f172a; padding:4px 10px; font-size:11px; margin:0;">🌍 Vitrinde Paylaş</button><button onclick="deleteFolder('${f}')" style="background:transparent; border:1px solid var(--danger-color); color:var(--danger-color); padding:4px 10px; font-size:11px; margin:0;">Sil</button></div></div>`;
        let lCont = document.createElement('div'); lCont.className = 'links-container';
        if(!userData.folders[f].length) lCont.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Klasör boş.</p>';
        userData.folders[f].forEach(site => { lCont.innerHTML += `<div class="link-card" onclick="window.open('${site.url}','_blank')">${site.name}</div>`; });
        fDiv.appendChild(lCont); w.appendChild(fDiv);
    }
}

function renderGuestUI() {
    const w = document.getElementById('guestFoldersWrapper'); w.innerHTML = '';
    const s = document.getElementById('guestFolderSelect'); s.innerHTML = '<option value="">-- Klasör Seç --</option>';
    for (let f in guestData.folders) {
        s.innerHTML += `<option value="${f}">${f}</option>`;
        let fDiv = document.createElement('div'); fDiv.className = 'folder-section';
        fDiv.innerHTML = `<div class="folder-title"><span>📂 ${f}</span><button onclick="deleteGuestFolder('${f}')" style="background:transparent; border:1px solid var(--danger-color); color:var(--danger-color); padding:4px 10px; font-size:11px; margin:0;">Sil</button></div>`;
        let lCont = document.createElement('div'); lCont.className = 'links-container';
        if(!guestData.folders[f].length) lCont.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Klasör boş.</p>';
        guestData.folders[f].forEach(site => { lCont.innerHTML += `<div class="link-card" onclick="window.open('${site.url}','_blank')">${site.name}</div>`; });
        fDiv.appendChild(lCont); w.appendChild(fDiv);
    }
}
