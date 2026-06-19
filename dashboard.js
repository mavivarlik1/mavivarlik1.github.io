let db, uid, fsTools;
let userData = { folders: {}, files: [] };

export async function initDashboard(database, user, firestoreTools) {
    db = database;
    uid = user.uid;
    fsTools = firestoreTools;
    await loadUserData();
}

async function loadUserData() {
    const docRef = fsTools.doc(db, "users", uid);
    const docSnap = await fsTools.getDoc(docRef);
    if(docSnap.exists()) { 
        userData = docSnap.data(); 
        if(!userData.folders) userData.folders = {};
        if(!userData.files) userData.files = [];
    }
    renderUI();
    renderFilesUI();
}

async function saveToFirebase() {
    await fsTools.setDoc(fsTools.doc(db, "users", uid), userData);
}

window.createNewFolder = async () => {
    const name = document.getElementById('newFolderNameInput').value.trim();
    if(!name || userData.folders[name]) return alert("Geçersiz veya var olan isim!");
    userData.folders[name] = []; 
    await saveToFirebase();
    document.getElementById('newFolderNameInput').value = '';
    renderUI();
    window.triggerMaskot('folder_add');
};

window.addNewLinkToFolder = async () => {
    const folder = document.getElementById('folderSelect').value;
    const name = document.getElementById('siteNameInput').value.trim();
    let url = document.getElementById('siteUrlInput').value.trim();
    if(!folder || !name || !url) return alert("Eksik bilgi!");
    if(!url.startsWith('http')) url = 'https://' + url;
    userData.folders[folder].push({ name, url });
    await saveToFirebase();
    document.getElementById('siteNameInput').value = ''; document.getElementById('siteUrlInput').value = '';
    renderUI();
};

window.deleteFolder = async (folderName) => {
    if(confirm("Silinsin mi?")) { delete userData.folders[folderName]; await saveToFirebase(); renderUI(); }
};

window.createNewTextFile = async () => {
    const name = document.getElementById('newFileName').value.trim();
    const content = document.getElementById('newFileContent').value;
    if(!name) return alert("Ad girin!");
    const base64 = btoa(unescape(encodeURIComponent(content)));
    userData.files.push({ name, size: content.length + " bytes", data: "data:text/plain;base64," + base64 });
    await saveToFirebase();
    document.getElementById('newFileName').value = ''; document.getElementById('newFileContent').value = '';
    renderFilesUI();
    window.triggerMaskot('file_add');
};

window.uploadLocalFile = () => {
    const input = document.getElementById('localFileUploader');
    if(!input.files.length) return alert("Dosya seç!");
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        userData.files.push({ name: file.name, size: (file.size/1024).toFixed(2) + " KB", data: e.target.result });
        await saveToFirebase();
        input.value = '';
        renderFilesUI();
        window.triggerMaskot('file_add');
    };
    reader.readAsDataURL(file);
};

window.deleteStoredFile = async (index) => {
    if(confirm("Dosya kalıcı silinsin mi?")) { userData.files.splice(index, 1); await saveToFirebase(); renderFilesUI(); }
};

window.viewFile = (index) => {
    const file = userData.files[index];
    const body = document.getElementById('viewerBody');
    document.getElementById('viewerTitle').innerText = file.name;
    body.innerHTML = '';
    if (file.data.startsWith('data:image/')) {
        body.innerHTML = `<img src="${file.data}" class="viewer-img">`;
    } else {
        try {
            const txt = decodeURIComponent(escape(atob(file.data.split(',')[1])));
            body.innerHTML = `<textarea class="viewer-text" readonly>${txt}</textarea>`;
        } catch (e) { body.innerHTML = '<p style="color:var(--danger-color)">Açılamadı.</p>'; }
    }
    document.getElementById('fileViewerModal').classList.remove('hidden');
    window.triggerMaskot('view');
};

window.closeFileViewer = () => document.getElementById('fileViewerModal').classList.add('hidden');

function renderFilesUI() {
    const wrapper = document.getElementById('fileStorageWrapper'); wrapper.innerHTML = '';
    if(!userData.files.length) return wrapper.innerHTML = '<p style="color:var(--text-muted); font-size:13px; grid-column:1/-1;">Dosya yok.</p>';
    userData.files.forEach((file, i) => {
        wrapper.innerHTML += `
            <div class="file-item">
                <div><div class="file-info">📄 ${file.name}</div><div class="file-size">${file.size}</div></div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; gap:5px;">
                        <button onclick="viewFile(${i})" style="flex:1; padding:6px; font-size:12px;">👁️ Aç</button>
                        <a href="${file.data}" download="${file.name}" onclick="window.triggerMaskot('download')" style="flex:1; text-align:center; background:rgba(255,255,255,0.1); color:white; text-decoration:none; padding:6px; font-size:12px; border-radius:6px; font-weight:600;">İndir</a>
                    </div>
                    <button onclick="deleteStoredFile(${i})" style="background:var(--danger-color); color:white; padding:6px; margin:0; font-size:12px;">Sil</button>
                </div>
            </div>`;
    });
}

function renderUI() {
    const wrapper = document.getElementById('foldersWrapper'); wrapper.innerHTML = '';
    const select = document.getElementById('folderSelect'); select.innerHTML = '<option value="">-- Klasör Seç --</option>';
    for (let folder in userData.folders) {
        select.innerHTML += `<option value="${folder}">${folder}</option>`;
        let fDiv = document.createElement('div'); fDiv.className = 'folder-section';
        fDiv.innerHTML = `<div class="folder-title"><span>📁 ${folder}</span><button onclick="deleteFolder('${folder}')" style="background:transparent; border:1px solid var(--danger-color); color:var(--danger-color); padding:4px 10px; font-size:11px; margin:0;">Sil</button></div>`;
        let lCont = document.createElement('div'); lCont.className = 'links-container';
        if(!userData.folders[folder].length) lCont.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Boş klasör.</p>';
        userData.folders[folder].forEach(site => {
            lCont.innerHTML += `<div class="link-card" onclick="window.open('${site.url}','_blank')">${site.name}</div>`;
        });
        fDiv.appendChild(lCont); wrapper.appendChild(fDiv);
    }
}
