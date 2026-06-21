// chat.js
export function initChatModule(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot } = fsTools;
    let currentUrlChatListener = null;

    // 🌍 Genel Odası Dinleyicisi
    const qGlobal = query(collection(db, "global_chat"), orderBy("timestamp", "asc"));
    onSnapshot(qGlobal, (snapshot) => {
        const box = document.getElementById('globalChatMsgs');
        if(!box) return;
        box.innerHTML = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            box.innerHTML += `<div class="msg"><b style="color:var(--accent-color);">${d.sender}:</b> ${d.text}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });

    // 🔗 Dinamik URL Odası Dinleyicisi
    window.loadUrlChat = function() {
        let url = document.getElementById('urlChatTarget').value.trim().toLowerCase();
        if(!url) { document.getElementById('urlChatMsgs').innerHTML = ''; return; }
        
        let safeUrl = url.replace(/[^a-z0-9]/g, '_');
        if(currentUrlChatListener) currentUrlChatListener(); 
        
        const qUrl = query(collection(db, `url_chats/${safeUrl}/messages`), orderBy("timestamp", "asc"));
        currentUrlChatListener = onSnapshot(qUrl, (snapshot) => {
            const box = document.getElementById('urlChatMsgs');
            if(!box) return;
            box.innerHTML = '';
            snapshot.forEach(doc => {
                const d = doc.data();
                box.innerHTML += `<div class="msg"><b style="color:var(--success-color);">${d.sender}:</b> ${d.text}</div>`;
            });
            box.scrollTop = box.scrollHeight;
        });
    };

    // ✉️ Mesaj Gönderici
    window.sendChatMessage = async function(type) {
        if(type === 'global') {
            const txt = document.getElementById('globalMsgInput').value.trim();
            if(!txt) return;
            await addDoc(collection(db, "global_chat"), { sender: user.nick, text: txt, timestamp: Date.now(), uid: user.uid });
            document.getElementById('globalMsgInput').value = '';
        } else if (type === 'url') {
            const url = document.getElementById('urlChatTarget').value.trim().toLowerCase();
            const txt = document.getElementById('urlMsgInput').value.trim();
            if(!url || !txt) return;
            let safeUrl = url.replace(/[^a-z0-9]/g, '_');
            await addDoc(collection(db, `url_chats/${safeUrl}/messages`), { sender: user.nick, text: txt, timestamp: Date.now(), uid: user.uid });
            document.getElementById('urlMsgInput').value = '';
        }
    };
}
