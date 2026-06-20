// guestdashboard.js - CoreBase LocalStorage ve Misafir Sürücüsü Yönetim Masası

// LocalStorage'dan verileri güvenli şekilde çekme yardımcıları
const getLocalFolders = () => JSON.parse(localStorage.getItem('guest_folders')) || {};
const getLocalFiles = () => JSON.parse(localStorage.getItem('guest_files')) || [];

// 1. Yeni Yerel Klasör Yaratma Fonksiyonu
window.createGuestFolder = function() {
    const folderInput = document.getElementById('guestNewFolderNameInput');
    if (!folderInput) return;
    
    const folderName = folderInput.value.trim();
    
    if (!folderName) return alert("Lütfen geçerli bir klasör ismi girin!");
    
    const folders = getLocalFolders();
    if (folders[folderName]) return alert("Bu isimde bir yerel klasör zaten mevcut!");
    
    folders[folderName] = { links: [] };
    localStorage.setItem('guest_folders', JSON.stringify(folders));
    
    folderInput.value = '';
    
    // Arayüzü anında güncelle
    renderGuestFolders();
    loadGuestFolderSelect();
};

// 2. Yerel Klasöre Link Ekleme Fonksiyonu
window.addGuestLinkToFolder = function() {
    const folderSelect = document.getElementById('guestFolderSelect');
    const titleInput = document.getElementById('guestSiteNameInput');
    const urlInput = document.getElementById('guestSiteUrlInput');
    
    if (!folderSelect || !titleInput || !urlInput) return;
    
    const selectedFolder = folderSelect.value;
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!selectedFolder) return alert("Lütfen link eklemek için bir yerel klasör seçin!");
    if (!title || !url) return alert("Başlık ve URL alanları boş bırakılamaz!");
    
    const folders = getLocalFolders();
    if (!folders[selectedFolder]) return alert("Seçilen klasör hafızada bulunamadı!");
    
    folders[selectedFolder].links.push({ title, url });
    localStorage.setItem('guest_folders', JSON.stringify(folders));
    
    titleInput.value = '';
    urlInput.value = '';
    
    renderGuestFolders();
};

// 3. Yerel Metin Dosyası Oluşturma Fonksiyonu
window.createGuestTextFile = function() {
    const nameInput = document.getElementById('guestNewFileName');
    const contentInput = document.getElementById('guestNewFileContent');
    
    if (!nameInput || !contentInput) return;
    
    const fileName = nameInput.value.trim() || "notlar.txt";
    const content = contentInput.value;
    
    const files = getLocalFiles();
    files.push({ 
        name: fileName, 
        content: content, 
        type: 'text', 
        date: new Date().toLocaleDateString() 
    });
    localStorage.setItem('guest_files', JSON.stringify(files));
    
    nameInput.value = '';
    contentInput.value = '';
    
    renderGuestFiles();
};

// 4. Cihazdan Yerel Dosya Yükleme Fonksiyonu (Base64 Bellek Simülasyonu)
window.uploadGuestLocalFile = function() {
    const fileUploader = document.getElementById('guestLocalFileUploader');
    if (!fileUploader || !fileUploader.files[0]) return alert("Lütfen önce cihazınızdan bir dosya seçin!");
    
    const file = fileUploader.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const files = getLocalFiles();
        files.push({
            name: file.name,
            content: e.target.result,
            type: file.type.startsWith('image/') ? 'image' : 'binary',
            date: new Date().toLocaleDateString()
        });
        localStorage.setItem('guest_files', JSON.stringify(files));
        fileUploader.value = '';
        renderGuestFiles();
    };
    
    if (file.type.startsWith('text/')) {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file);
    }
};

// 5. Yerel Klasörleri ve İçindeki Linkleri Ekrana Basma Motoru
function renderGuestFolders() {
    const wrapper = document.getElementById('guestFoldersWrapper');
    if (!wrapper) return;
    
    const folders = getLocalFolders();
    wrapper.innerHTML = '';
    
    Object.keys(folders).forEach(folderName => {
        const folderData = folders[folderName];
        
        let linksHTML = '';
        folderData.links.forEach(link => {
            linksHTML += `
                <div class="link-card" onclick="window.open('${link.url}', '_blank')">
                    <div style="font-weight:600; color:var(--accent-color);">${link.title}</div>
                    <div style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${link.url}</div>
                </div>
            `;
        });
        
        const folderEl = document.createElement('div');
        folderEl.className = 'folder-section';
        folderEl.innerHTML = `
            <div class="folder-title">
                <span>📁 ${folderName}</span>
                <button onclick="deleteGuestFolder('${folderName}')" style="background:var(--danger-color); color:white; padding:4px 8px; font-size:11px; border:none; border-radius:4px; cursor:pointer;">Sil</button>
            </div>
            <div class="links-container">
                ${linksHTML || '<div style="color:var(--text-muted); font-size:12px; font-style:italic;">Bu klasör henüz boş...</div>'}
            </div>
        `;
        wrapper.appendChild(folderEl);
    });
}

// 6. Yerel Dosyaları Ekrana Basma Motoru
function renderGuestFiles() {
    const wrapper = document.getElementById('guestFileStorageWrapper');
    if (!wrapper) return;
    
    const files = getLocalFiles();
    wrapper.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileEl = document.createElement('div');
        fileEl.className = 'file-item';
        
        let previewAction = '';
        if (file.type === 'text') {
            previewAction = `alert(\`Dosya İçeriği (${file.name}):\\n\\n\${JSON.stringify(file.content).slice(1, -1)}\`)`;
        } else if (file.type === 'image') {
            previewAction = `const w=window.open(); w.document.write('<img src="${file.content}" style="max-width:100%;">')`;
        } else {
            previewAction = `alert('Bu şifreli ikili dosya misafir modunda sadece saklanabilir, önizlenemez.')`;
        }

        fileEl.innerHTML = `
            <div style="font-weight:600; color:var(--text-color); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📄 ${file.name}</div>
            <div style="font-size:11px; color:var(--text-muted);">${file.date}</div>
            <div style="display:flex; gap:5px; margin-top:5px;">
                <button onclick="${previewAction}" style="padding:4px 8px; font-size:11px; width:100%;">Gör</button>
                <button onclick="deleteGuestFile(${index})" style="background:var(--danger-color); color:white; padding:4px 8px; font-size:11px; border:none; border-radius:4px; cursor:pointer;">Sil</button>
            </div>
        `;
        wrapper.appendChild(fileEl);
    });
}

// 7. Misafir Klasör Seçim Kutusunu Dinamik Doldurma
function loadGuestFolderSelect() {
    const select = document.getElementById('guestFolderSelect');
    if (!select) return;
    
    const folders = getLocalFolders();
    select.innerHTML = '<option value="" id="optGuestSelectFolder">-- Klasör Seç --</option>';
    
    Object.keys(folders).forEach(folderName => {
        const opt = document.createElement('option');
        opt.value = folderName;
        opt.innerText = folderName;
        select.appendChild(opt);
    });
}

// 8. Hafıza Temizleme ve Silme Yardımcıları
window.deleteGuestFolder = function(folderName) {
    if (!confirm(`"${folderName}" klasörünü ve içindeki tüm yerel linkleri silmek istediğinize emin misiniz?`)) return;
    const folders = getLocalFolders();
    delete folders[folderName];
    localStorage.setItem('guest_folders', JSON.stringify(folders));
    renderGuestFolders();
    loadGuestFolderSelect();
};

window.deleteGuestFile = function(index) {
    if (!confirm("Bu dosyayı tarayıcı hafızasından kalıcı olarak silmek istiyor musunuz?")) return;
    const files = getLocalFiles();
    files.splice(index, 1);
    localStorage.setItem('guest_files', JSON.stringify(files));
    renderGuestFiles();
};

// 9. Otomatik Rota Takipçisi (Misafir sayfasına geçildiğinde UI'ı tetikler)
function autoInitGuestDashboard() {
    const hash = window.location.hash;
    if (hash.includes('guestdashboard')) {
        renderGuestFolders();
        renderGuestFiles();
        loadGuestFolderSelect();
    }
}

// Olay dinleyicilerini bağla (index.html'e müdahaleyi sıfıra indirmek için)
window.addEventListener('hashchange', autoInitGuestDashboard);
window.addEventListener('load', autoInitGuestDashboard);
