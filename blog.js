// blog.js
export function initBlogModule(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot } = fsTools;
    
    const blogWritePanel = document.getElementById('blogWritePanel');
    const blogPostsWrapper = document.getElementById('blogPostsWrapper');
    if (!blogPostsWrapper) return;

    let localBlogCache = [];
    window.activeCommentUnsubs = window.activeCommentUnsubs || [];
    let isInitialLoad = true;

    // ⚙️ GELİŞMİŞ MULTİMEDYA VE MARKDOWN PARSÖRÜ
    function parseBlogContent(text) {
        if (!text) return "";

        // 1. Önce güvenli HTML kaçışlarını yap ve kalın yazıları pars et
        let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Satır satır bölerek link taraması yapalım
        let lines = parsed.split('\n');
        let processedLines = lines.map(line => {
            let trimmed = line.trim();

            // 📸 RESİM LİNKİ YAKALAYICI: Sonu jpg, jpeg, png, gif, webp olan linkleri direkt <img> yapar
            const imgRegex = /(https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.gif|\.webp)(?:\?[^\s]*)?)/gi;
            if (imgRegex.test(trimmed)) {
                return trimmed.replace(imgRegex, '<div style="margin: 20px 0; text-align:center;"><img src="$1" style="max-width:100%; max-height:420px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.4);" alt="Blog Görseli"></div>');
            }

            // 🎥 YOUTUBE VİDEO LİNKİ YAKALAYICI: Standart veya kısa YouTube linklerini direkt oynatıcıya (iframe) çevirir
            const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+))/gi;
            if (ytRegex.test(trimmed)) {
                return trimmed.replace(ytRegex, (match, url, videoId) => {
                    return `<div style="margin: 20px 0; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}" style="width:100%; height:360px; border:none;" allowfullscreen></iframe></div>`;
                });
            }

            return line;
        });

        return processedLines.join('\n');
    }

    // 🎨 COMPACT / DETAY GÖRÜNÜM ÇIZİM MOTORU
    window.refreshBlogRender = function() {
        window.activeCommentUnsubs.forEach(unsub => unsub());
        window.activeCommentUnsubs = [];
        blogPostsWrapper.innerHTML = '';
        const subHash = window.currentBlogSubHash;

        if (localBlogCache.length === 0) {
            blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">📰 Henüz blog bülteni yayınlanmadı.</div>`;
            return;
        }

        if (subHash) {
            if (blogWritePanel) blogWritePanel.classList.add('hidden');
            const post = localBlogCache.find(b => b.customId === subHash);
            if (post) {
                const card = document.createElement('div'); 
                card.className = 'blog-card';
                card.innerHTML = `
                    <div style="margin-bottom:15px;"><a href="#blog" style="color:var(--accent-color); text-decoration:none; font-size:13px; font-weight:600;">← Tüm Makale Listesine Dön</a></div>
                    <h2 style="margin-top:0; color:var(--accent-color); font-size:22px;">${post.title}</h2>
                    <div class="blog-meta"><span>👤 Yazar: <b>${post.author}</b></span><span>📅 ${post.formattedDate}</span></div>
                    <div class="blog-content">${parseBlogContent(post.content)}</div>
                    
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin:20px 0;">
                    <h4 style="margin:0 0 10px 0; font-size:15px; color:var(--accent-color);">Yorumlar</h4>
                    <div id="comments-list-${post.id}" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; max-height:220px; overflow-y:auto; padding-right:5px;"><span style="font-size:12px; color:var(--text-muted); font-style:italic;">Yorumlar yükleniyor...</span></div>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="comment-input-${post.id}" placeholder="Düşüncelerinizi yazın..." style="margin:0; padding:10px 12px; font-size:13px; height:38px;">
                        <button onclick="window.addBlogComment('${post.id}')" style="padding:0 16px; font-size:13px; margin:0; white-space:nowrap; height:38px; display:flex; align-items:center; justify-content:center;">Gönder</button>
                    </div>
                `;
                blogPostsWrapper.appendChild(card);

                const commentsQ = query(collection(db, `blogs/${post.id}/comments`), orderBy("createdAt", "asc"));
                const unsubComments = onSnapshot(commentsQ, (commentSnap) => {
                    const listEl = document.getElementById(`comments-list-${post.id}`); 
                    if (!listEl) return; 
                    listEl.innerHTML = '';
                    if (commentSnap.empty) { listEl.innerHTML = `<div style="font-size:12px; color:var(--text-muted); font-style:italic;">İlk yorumu siz yazın!</div>`; return; }
                    commentSnap.forEach(cDoc => {
                        const cData = cDoc.data();
                        listEl.innerHTML += `<div style="background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:8px; border-left:2px solid var(--accent-color); font-size:13px; word-break:break-word;"><b style="color:var(--accent-color);">${cData.author}:</b> ${cData.text}</div>`;
                    });
                    listEl.scrollTop = listEl.scrollHeight;
                });
                window.activeCommentUnsubs.push(unsubComments);
            }
        } else {
            if (blogWritePanel) {
                if (user.role === 'kurucu' || user.role === 'maker') blogWritePanel.classList.remove('hidden');
                else blogWritePanel.classList.add('hidden');
            }
            localBlogCache.forEach(post => {
                const card = document.createElement('div'); 
                card.className = 'blog-card';
                card.innerHTML = `
                    <h2 style="margin-top:0; color:var(--accent-color); font-size:18px; cursor:pointer; line-height:1.4;" onclick="window.location.hash='#blog#${post.customId}'">${post.title}</h2>
                    <div class="blog-meta" style="margin-bottom:0;"><span>👤 Yazar: <b>${post.author}</b></span><span>📅 ${post.formattedDate}</span><span style="color:var(--accent-color); cursor:pointer; font-weight:600; font-size:12px; text-decoration:underline;" onclick="window.location.hash='#blog#${post.customId}'">Devamını Oku & İçerik →</span></div>
                `;
                blogPostsWrapper.appendChild(card);
            });
        }
    };

    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        localBlogCache = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data(); 
            let dateObj = new Date();
            if (data.createdAt) { if (typeof data.createdAt.toDate === 'function') dateObj = data.createdAt.toDate(); else dateObj = new Date(data.createdAt); }
            const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            let customId = data.customId;
            if (!customId) {
                let numericHash = ""; for (let i = 0; i < docSnap.id.length; i++) { numericHash += docSnap.id.charCodeAt(i).toString(); }
                customId = numericHash.substring(0, 12);
            }
            localBlogCache.push({ id: docSnap.id, customId: customId, title: data.title, content: data.content, author: data.author, formattedDate: formattedDate });
        });
        window.refreshBlogRender();
    });

    window.addBlogComment = async function(blogId) {
        const input = document.getElementById(`comment-input-${blogId}`); if (!input) return;
        const text = input.value.trim(); if (!text) return alert(`Lütfen boş yorum göndermeyin, ${user.nick}!`);
        try {
            await addDoc(collection(db, `blogs/${blogId}/comments`), { author: user.nick, uid: user.uid, text: text, createdAt: Date.now() });
            input.value = '';
        } catch(e) { alert("Yorum iletim hatası: " + e.message); }
    };

    window.createNewBlogPost = async function() {
        const titleInput = document.getElementById('blogTitleInput'); 
        const contentInput = document.getElementById('blogContentInput');
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim(); 
        const content = contentInput.value.trim();
        if (!title || !content) return alert(`Başlık ve makale içeriğini doldurun, ${user.nick}!`);
        
        const customId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        try {
            await addDoc(collection(db, "blogs"), { title: title, content: content, customId: customId, author: user.nick, uid: user.uid, createdAt: new Date() });
            titleInput.value = ''; contentInput.value = '';
            alert("Makaleniz multimedya tarama desteğiyle birlikte başarıyla yayına alındı."); 
            window.location.hash = "#blog";
        } catch (error) { alert("Yayınlama hatası: " + error.message); }
    };
}
