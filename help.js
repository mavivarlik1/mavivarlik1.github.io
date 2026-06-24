// help.js
import { deleteDoc, doc, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function initHelpForum(db, user, fsTools) {
    const helpTopicsWrapper = document.getElementById('helpTopicsWrapper');
    const helpWritePanel = document.getElementById('helpWritePanel');
    if (!helpTopicsWrapper) return;

    let localTopicsCache = [];
    window.activeHelpUnsubs = window.activeHelpUnsubs || [];

    // 🎨 FORUM ÇİZİM VE GÖRÜNÜM MOTORU
    window.refreshHelpRender = function() {
        window.activeHelpUnsubs.forEach(unsub => unsub());
        window.activeHelpUnsubs = [];
        helpTopicsWrapper.innerHTML = '';

        const fullHash = window.location.hash.replace('#', '');
        const hashParts = fullHash.split('#');
        const subHash = hashParts[1] || null;

        if (subHash) {
            // 🔎 DETAYLI KONU GÖRÜNÜMÜ
            if (helpWritePanel) helpWritePanel.classList.add('hidden');
            const topic = localTopicsCache.find(t => t.id === subHash);
            
            if (topic) {
                const detailCard = document.createElement('div');
                detailCard.className = 'modal';
                
                // Yetki Kontrolü Filtresi: Sadece kurucu veya konuyu açan kişi silebilir (Yetki yoksa buton basılmaz/gizlenir)
                const canDeleteTopic = user.role === 'kurucu' || topic.uid === user.uid;
                const deleteBtnHtml = canDeleteTopic ? `<button onclick="window.deleteHelpTopic('${topic.id}')" style="background:var(--danger-color); padding:4px 10px; font-size:12px; margin-left:10px;">Konuyu Sil</button>` : '';

                detailCard.innerHTML = `
                    <div style="margin-bottom:15px;"><a href="#help" style="color:var(--accent-color); text-decoration:none; font-size:13px; font-weight:500;">← Forum Listesine Dön</a></div>
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <h3 style="margin:0; color:var(--text-color); font-size:16px; flex:1;">${topic.title}</h3>
                        ${deleteBtnHtml}
                    </div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:5px; margin-bottom:15px;">👤 Açan: <b>${topic.author}</b> | 📅 ${topic.formattedDate}</div>
                    
                    <hr style="border:0; border-top:1px solid var(--glass-border); margin:15px 0;">
                    <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--accent-color);">Cevaplar</h4>
                    <div id="replies-list-${topic.id}" style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px; max-height:300px; overflow-y:auto; padding-right:5px;">
                        <span style="font-size:12px; color:var(--text-muted); font-style:italic;">Cevaplar yükleniyor...</span>
                    </div>
                    
                    <div style="display:flex; gap:8px; flex-direction:column; background:var(--inner-bg); padding:12px; border-radius:6px; border:var(--glass-border);">
                        <textarea id="reply-input-${topic.id}" placeholder="Çözüm önerinizi veya cevabınızı yazın..." rows="3" style="margin:0; font-size:13px;"></textarea>
                        <button onclick="window.addHelpReply('${topic.id}')" style="align-self:flex-end; padding:8px 16px; font-size:13px; margin:0;">Cevap Gönder</button>
                    </div>
                `;
                helpTopicsWrapper.appendChild(detailCard);

                // Anlık Cevap Dinleyicisi
                const repliesQ = query(collection(db, `helpTopics/${topic.id}/replies`), orderBy("createdAt", "asc"));
                const unsubReplies = onSnapshot(repliesQ, (repliesSnap) => {
                    const listEl = document.getElementById(`replies-list-${topic.id}`);
                    if (!listEl) return;
                    listEl.innerHTML = '';
                    
                    if (repliesSnap.empty) {
                        listEl.innerHTML = `<div style="font-size:12px; color:var(--text-muted); font-style:italic;">Bu konuya henüz cevap yazılmamış.</div>`;
                        return;
                    }

                    repliesSnap.forEach(rDoc => {
                        const rData = rDoc.data();
                        const canDeleteReply = user.role === 'kurucu' || rData.uid === user.uid;
                        const replyDeleteBtn = canDeleteReply ? `<span onclick="window.deleteHelpReply('${topic.id}', '${rDoc.id}')" style="color:var(--danger-color); cursor:pointer; font-size:11px; text-decoration:underline; margin-left:auto;">Sil</span>` : '';
                        
                        const replyItem = document.createElement('div');
                        replyItem.className = 'msg';
                        replyItem.style.display = 'flex';
                        replyItem.style.flexDirection = 'column';
                        replyItem.style.gap = '4px';
                        replyItem.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                <b style="color:var(--accent-color); font-size:12px;">${rData.author}:</b>
                                ${replyDeleteBtn}
                            </div>
                            <div style="font-size:13px; color:var(--text-color); white-space:pre-wrap;">${rData.text}</div>
                        `;
                        listEl.appendChild(replyItem);
                    });
                    listEl.scrollTop = listEl.scrollHeight;
                }, (error) => { console.warn("Cevap okuma yetki sınırlandırması maskelendi."); });
                window.activeHelpUnsubs.push(unsubReplies);
            } else {
                helpTopicsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">⚠️ Konu bulunamadı veya silinmiş.</div>`;
            }
        } else {
            // 📑 GENEL LİSTE GÖRÜNÜMÜ
            if (helpWritePanel) helpWritePanel.classList.remove('hidden');
            
            if (localTopicsCache.length === 0) {
                helpTopicsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">Henüz yardım konusu açılmadı.</div>`;
                return;
            }

            localTopicsCache.forEach(topic => {
                const item = document.createElement('div');
                item.className = 'modal';
                item.style.padding = '15px';
                item.style.cursor = 'pointer';
                item.onclick = function(e) {
                    if(e.target.tagName !== 'BUTTON') {
                        window.location.hash = `#help#${topic.id}`;
                    }
                };
                item.itemHTML = ``;
                item.innerHTML = `
                    <h4 style="margin:0 0 5px 0; color:var(--accent-color); font-size:15px; line-height:1.4;">${topic.title}</h4>
                    <div style="font-size:12px; color:var(--text-muted);">👤 Açan: <b>${topic.author}</b> | 📅 ${topic.formattedDate} <span style="color:var(--accent-color); margin-left:10px; font-weight:600;">Görüntüle & Cevapla →</span></div>
                `;
                helpTopicsWrapper.appendChild(item);
            });
        }
    };

    // ✍️ YENİ KONU AÇMA FONKSİYONU
    window.createNewHelpTopic = async function() {
        const input = document.getElementById('helpTitleInput');
        if (!input) return;
        const title = input.value.trim();
        if (!title) return alert("Lütfen geçerli bir soru başlığı girin.");

        try {
            await addDoc(collection(db, "helpTopics"), {
                title: title,
                author: user.nick,
                uid: user.uid,
                createdAt: Date.now()
            });
            input.value = '';
            alert("Teknik yardım konunuz başarıyla topluluğa iletildi.");
        } catch (e) {
            alert("Konu açma hatası: " + e.message);
        }
    };

    // 💬 CEVAP EKLEME FONKSİYONU
    window.addHelpReply = async function(topicId) {
        const input = document.getElementById(`reply-input-${topicId}`);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return alert("Lütfen boş bir cevap göndermeyin.");

        try {
            await addDoc(collection(db, `helpTopics/${topicId}/replies`), {
                author: user.nick,
                uid: user.uid,
                text: text,
                createdAt: Date.now()
            });
            input.value = '';
        } catch(e) {
            alert("Cevap iletilemedi: " + e.message);
        }
    };

    // ❌ KONU SİLME MOTORU
    window.deleteHelpTopic = async function(topicId) {
        if (!confirm("Bu forum konusunu kalıcı olarak silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "helpTopics", topicId));
            alert("Konu başarıyla silindi.");
            window.location.hash = "#help";
        } catch(e) {
            alert("Silme hatası: " + e.message);
        }
    };

    // ❌ CEVAP SİLME MOTORU
    window.deleteHelpReply = async function(topicId, replyId) {
        if (!confirm("Bu cevabı kalıcı olarak silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, `helpTopics/${topicId}/replies`, replyId));
        } catch(e) {
            alert("Cevap silinemedi: " + e.message);
        }
    };

    // VERİTABANI DİNLEYİCİSİ
    const q = query(collection(db, "helpTopics"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        localTopicsCache = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let dateObj = new Date(data.createdAt || Date.now());
            const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            localTopicsCache.push({
                id: docSnap.id,
                title: data.title,
                author: data.author,
                uid: data.uid,
                formattedDate: formattedDate
            });
        });
        if (window.location.hash.startsWith('#help')) {
            window.refreshHelpRender();
        }
    }, (err) => { console.warn("Veritabanı forum akış kısıtlaması maskelendi."); });

    const originalHandleRoute = window.handleRoute;
    window.handleRoute = function() {
        if (originalHandleRoute) originalHandleRoute();
        let fullHash = window.location.hash.replace('#', '') || 'dashboard';
        if (fullHash.startsWith('help') && window.refreshHelpRender) {
            window.refreshHelpRender();
        }
    };
}
