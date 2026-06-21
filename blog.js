// blog.js
import { deleteDoc, doc, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function initBlogModule(db, user, fsTools) {
    const blogWritePanel = document.getElementById('blogWritePanel');
    const blogPostsWrapper = document.getElementById('blogPostsWrapper');
    if (!blogPostsWrapper) return;

    let localBlogCache = [];
    window.activeCommentUnsubs = window.activeCommentUnsubs || [];

    // GELİŞMİŞ MULTİMEDYA VE MARKDOWN PARSÖRÜ
    function parseBlogContent(text) {
        if (!text) return "";

        let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        let lines = parsed.split('\n');
        
        let processedLines = lines.map(line => {
            let trimmed = line.trim();

            // RESİM LİNKİ YAKALAYICI
            const imgRegex = /(https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.gif|\.webp)(?:\?[^\s]*)?)/gi;
            if (imgRegex.test(trimmed)) {
                return trimmed.replace(imgRegex, '<div style="margin: 15px 0; text-align:center;"><img src="$1" style="max-width:100%; max-height:400px; border-radius:8px; border:var(--glass-border);" alt="Haber Görseli"></div>');
            }

            // YOUTUBE VİDEO LİNKİ YAKALAYICI
            const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+))/gi;
            if (ytRegex.test(trimmed)) {
                return trimmed.replace(ytRegex, (match, url, videoId) => {
                    return `<div style="margin: 15px 0; border-radius:8px; overflow:hidden; border:var(--glass-border);"><iframe src="https://www.youtube.com/embed/${videoId}" style="width:100%; height:360px; border:none;" allowfullscreen></iframe></div>`;
                });
            }

            return line;
        });

        return processedLines.join('\n');
    }

    // COMPACT / DETAY GÖRÜNÜM ÇIZİM MOTORU
    window.refreshBlogRender = function() {
        window.activeCommentUnsubs.forEach(unsub => unsub());
        window.activeCommentUnsubs = [];
        blogPostsWrapper.innerHTML = '';
        const subHash = window.currentBlogSubHash;

        if (localBlogCache.length === 0) {
            blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">Henüz blog bülteni yayınlanmadı.</div>`;
            return;
        }

        if (subHash) {
            if (blogWritePanel) blogWritePanel.classList.add('hidden');
            const post = localBlogCache.find(b => b.customId === subHash);
            
            if (post) {
                const card = document.createElement('div'); 
                card.className = 'blog-card';
                
                // Yetki Kontrolü: Sadece kurucu veya makaleyi yazan silebilir
                const canDeletePost = user.role === 'kurucu' || post.uid === user.uid;
                const deletePostBtnHtml = canDeletePost ? `<button onclick="window.deleteBlogPost('${post.id}')" style="background:var(--danger-color); padding:4px 10px; font-size:12px; margin-left:auto;">Makaleyi Sil</button>` : '';

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                        <div><a href="#blog" style="color:var(--accent-color); text-decoration:none; font-size:13px; font-weight:500;">← Tüm Makale Listesine Dön</a></div>
                        ${deletePostBtnHtml}
                    </div>
                    <h2 style="margin-top:0; color:var(--text-color); font-size:20px; font-weight:600;">${post.title}</h2>
                    <div class="blog-meta"><span>👤 Yazar: <b>${post.author}</b></span><span>📅 ${post.formattedDate}</span></div>
                    <div class="blog-content">${parseBlogContent(post.content)}</div>
                    
                    <hr style="border:0; border-top:1px solid var(--glass-border); margin:20px 0;">
                    <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--accent-color);">Yorumlar</h4>
                    <div id="comments-list-${post.id}" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; max-height:250px; overflow-y:auto; padding-right:5px;">
                        <span style="font-size:12px; color:var(--text-muted); font-style:italic;">Yorumlar yükleniyor...</span>
                    </div>
                    
                    <div style="display:flex; gap:8px; flex-direction:column; background:var(--inner-bg); padding:12px; border-radius:6px; border:var(--glass-border);">
                        <input type="text" id="comment-input-${post.id}" placeholder="Düşüncelerinizi yazın..." style="margin:0; padding:10px; font-size:13px;">
                        <button onclick="window.addBlogComment('${post.id}')" style="align-self:flex-end; padding:6px 14px; font-size:13px; margin:0;">Gönder</button>
                    </div>
                `;
                blogPostsWrapper.appendChild(card);

                // Anlık Yorum Dinleyicisi
                const commentsQ = query(collection(db, `blogs/${post.id}/comments`), orderBy("createdAt", "asc"));
                const unsubComments = onSnapshot(commentsQ, (commentSnap) => {
                    const listEl = document.getElementById(`comments-list-${post.id}`); 
                    if (!listEl) return; 
                    listEl.innerHTML = '';
                    
                    if (commentSnap.empty) { 
                        listEl.innerHTML = `<div style="font-size:12px; color:var(--text-muted); font-style:italic;">İlk yorumu siz yazın!</div>`; 
                        return; 
                    }

                    commentSnap.forEach(cDoc => {
                        const cData = cDoc.data();
                        const canDeleteComment = user.role === 'kurucu' || cData.uid === user.uid;
                        const commentDeleteBtn = canDeleteComment ? `<span onclick="window.deleteBlogComment('${post.id}', '${cDoc.id}')" style="color:var(--danger-color); cursor:pointer; font-size:11px; text-decoration:underline; margin-left:auto;">Sil</span>` : '';
                        
                        const commentItem = document.createElement('div');
                        commentItem.className = 'msg';
                        commentItem.style.display = 'flex';
                        commentItem.style.flexDirection = 'column';
                        commentItem.style.gap = '2px';
                        commentItem.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                <b style="color:var(--accent-color); font-size:12px;">${cData.author}:</b>
                                ${commentDeleteBtn}
                            </div>
                            <div style="font-size:13px; color:var(--text-color);">${cData.text}</div>
                        `;
                        listEl.appendChild(commentItem);
                    });
                    listEl.scrollTop = listEl.scrollHeight;
                });
                window.activeCommentUnsubs.push(unsubComments);
            } else {
                blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">⚠️ Makale bulunamadı veya kaldırılmış.</div>`;
            }
        } else {
            if (blogWritePanel) {
                if (user.role === 'kurucu' || user.role === 'maker') blogWritePanel.classList.remove('hidden');
                else blogWritePanel.classList.add('hidden');
            }
            localBlogCache.forEach(post => {
                const card = document.createElement('div'); 
                card.className = 'blog-card';
                card.style.padding = '20px';
                card.innerHTML = `
                    <h2 style="margin-top:0; color:var(--accent-color); font-size:16px; cursor:pointer; line-height:1.4;" onclick="window.location.hash='#blog#${post.customId}'">${post.title}</h2>
                    <div class="blog-meta" style="margin-bottom:0;"><span>👤 Yazar: <b>${post.author}</b></span><span>📅 ${post.formattedDate}</span><span style="color:var(--accent-color); cursor:pointer; font-weight:600; font-size:12px; text-decoration:underline; margin-left:auto;" onclick="window.location.hash='#blog#${post.customId}'">Devamını Oku →</span></div>
                `;
                blogPostsWrapper.appendChild(card);
            });
        }
    };

    // MAKALELERİ VERİTABANINDAN ALMA DİNLEYİCİSİ
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
            localBlogCache.push({ id: docSnap.id, customId: customId, title: data.title, content: data.content, author: data.author, uid: data.uid, formattedDate: formattedDate });
        });
        window.refreshBlogRender();
    });

    // YORUM EKLEME FONKSİYONU
    window.addBlogComment = async function(blogId) {
        const input = document.getElementById(`comment-input-${blogId}`); if (!input) return;
        const text = input.value.trim(); if (!text) return alert("Lütfen boş yorum göndermeyin.");
        try {
            await addDoc(collection(db, `blogs/${blogId}/comments`), { author: user.nick, uid: user.uid, text: text, createdAt: Date.now() });
            input.value = '';
        } catch(e) { alert("Yorum iletim hatası: " + e.message); }
    };

    // YENİ MAKALE OLUŞTURMA FONKSİYONU
    window.createNewBlogPost = async function() {
        const titleInput = document.getElementById('blogTitleInput'); 
        const contentInput = document.getElementById('blogContentInput');
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim(); 
        const content = contentInput.value.trim();
        if (!title || !content) return alert("Başlık ve makale içeriğini doldurun.");
        
        const customId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        try {
            await addDoc(collection(db, "blogs"), { title: title, content: content, customId: customId, author: user.nick, uid: user.uid, createdAt: new Date() });
            titleInput.value = ''; contentInput.value = '';
            alert("Makaleniz başarıyla yayına alındı."); 
            window.location.hash = "#blog";
        } catch (error) { alert("Yayınlama hatası: " + error.message); }
    };

    // MAKALE SİLME FONKSİYONU
    window.deleteBlogPost = async function(postId) {
        if (!confirm("Bu makaleyi ve ilgili tüm yorumları kalıcı olarak silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "blogs", postId));
            alert("Makale başarıyla kaldırıldı.");
            window.location.hash = "#blog";
        } catch(e) {
            alert("Makale silinirken hata oluştu: " + e.message);
        }
    };

    // YORUM SİLME FONKSİYONU
    window.deleteBlogComment = async function(postId, commentId) {
        if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, `blogs/${postId}/comments`, commentId));
        } catch(e) {
            alert("Yorum silinemedi: " + e.message);
        }
    };
}
