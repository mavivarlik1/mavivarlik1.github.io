let db, currentUserNick, fsTools;
let activeUrlChatListener = null;

export function initChatModule(database, user, firestoreTools) {
    db = database;
    currentUserNick = user.email.split('@')[0];
    fsTools = firestoreTools;
    
    // Uygulama açılır açılmaz Global Chat'i dinlemeye başla
    listenChatRoom("global_chat", "globalChatMsgs");
}

function listenChatRoom(collectionPath, elementId) {
    const q = fsTools.query(fsTools.collection(db, collectionPath), fsTools.orderBy("timestamp", "asc"));
    return fsTools.onSnapshot(q, (snapshot) => {
        const box = document.getElementById(elementId); box.innerHTML = '';
        snapshot.forEach(doc => {
            let d = doc.data();
            box.innerHTML += `<div class="msg"><b>${d.user}</b>: <span style="color: #cbd5e1;">${d.text}</span></div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.sendChatMessage = async (type) => {
    if(type === 'global') {
        const inp = document.getElementById('globalMsgInput'); if(!inp.value.trim()) return;
        await fsTools.addDoc(fsTools.collection(db, "global_chat"), { user: currentUserNick, text: inp.value.trim(), timestamp: Date.now() });
        inp.value = '';
    } else {
        const inp = document.getElementById('urlMsgInput'); 
        let rawUrl = document.getElementById('urlChatTarget').value.trim();
        if(!inp.value.trim() || !rawUrl) return; 
        
        let room = rawUrl.replace(/[\.\/]/g, "_");
        await fsTools.addDoc(fsTools.collection(db, `url_chats/${room}/messages`), { user: currentUserNick, text: inp.value.trim(), timestamp: Date.now() });
        inp.value = '';
    }
};

window.loadUrlChat = () => { 
    let rawUrl = document.getElementById('urlChatTarget').value.trim(); 
    if(!rawUrl) return; 
    let room = rawUrl.replace(/[\.\/]/g, "_"); 
    if(activeUrlChatListener) activeUrlChatListener(); 
    activeUrlChatListener = listenChatRoom(`url_chats/${room}/messages`, "urlChatMsgs"); 
};
