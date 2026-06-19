let db, user, fsTools;

export function initChatModule(database, currentUser, firestoreTools) {
    db = database; user = currentUser; fsTools = firestoreTools;
    listenChatRoom("global_chat", "globalChatMsgs");
}

function listenChatRoom(collectionPath, elementId) {
    fsTools.onSnapshot(fsTools.query(fsTools.collection(db, collectionPath), fsTools.orderBy("timestamp", "asc")), (snapshot) => {
        const box = document.getElementById(elementId); box.innerHTML = '';
        snapshot.forEach(doc => {
            let d = doc.data();
            let rankData = window.calculateRank(d.points || 0, d.email || '', d.role || 'user');
            box.innerHTML += `<div class="msg"><span class="badge ${rankData.class}">${rankData.name}</span> <b>${d.user}</b>: <span style="color: #cbd5e1;">${d.text}</span></div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.sendChatMessage = async (type) => {
    const inp = document.getElementById(type === 'global' ? 'globalMsgInput' : 'urlMsgInput');
    if(!inp.value.trim()) return;

    let chatData = {
        user: user.nick || user.email.split('@')[0],
        text: inp.value.trim(),
        timestamp: Date.now(),
        points: user.points || 0,
        role: user.role || 'user',
        email: user.email || ''
    };

    if(type === 'global') {
        await fsTools.addDoc(fsTools.collection(db, "global_chat"), chatData);
    } else {
        let rawUrl = document.getElementById('urlChatTarget').value.trim(); if(!rawUrl) return alert("Önce hedef URL girin!");
        let room = rawUrl.replace(/[\.\/]/g, "_");
        await fsTools.addDoc(fsTools.collection(db, `url_chats/${room}/messages`), chatData);
    }
    inp.value = '';
};
