// blog.js
export function initBlogModule(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot } = fsTools;
    
    const blogWritePanel = document.getElementById('blogWritePanel');
    const blogPostsWrapper = document.getElementById('blogPostsWrapper');
    if (!blogPostsWrapper) return;

    let localBlogCache = [];
    window.activeCommentUnsubs = window.activeCommentUnsubs || [];
    let isInitialLoad = true;

    function parseMarkdownBold(text) {
        if (!text) return "";
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    // 🎨 AKILLI COMPACT / DETAY GÖRÜNÜM MOTORU
    window.refreshBlogRender = function() {
        window.activeCommentUnsubs.forEach(unsub => unsub());
        window.activeCommentUnsubs = [];
        blogPostsWrapper.innerHTML = '';

        const subHash = window.currentBlogSubHash; 

        if (localBlogCache.length === 0) {
            blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">📰 Henüz blog yazısı yayınlanmadı.</div>`;
            return;
        }

        if (subHash) {
            // Detay sayfasında yazma panelini her şartta kilitle ve gizle
            if (blogWritePanel) blogWritePanel.classList.add('hidden');

            const post = localBlogCache.find(b => b.customId === subHash);
            if (post) {
                // 🛠️ MULTIMEDYA ENJEKSİYON MOTORU (Google Kalite Politikası Uyumu)
                let mediaHtml = '';
                if (post.imageUrl) {
                    mediaHtml += `<div style="margin: 15px 0; text-align:center;"><img src="${post.imageUrl}" style="max-width:100%; max-height:400px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.4);" alt="Haber Görseli"></div>`;
                }
                if (post.videoUrl) {
                    let embedUrl = post.videoUrl;
                    if (embedUrl.includes("watch?v=")) embedUrl = embedUrl.replace("watch?v=", "embed/");
                    else if (embedUrl.includes("youtu.be/")) embedUrl = embedUrl.replace("youtu.be/", "youtube.com/embed/");
                    
                    mediaHtml += `<div style="margin: 15px 0; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);"><iframe src="${embedUrl}" style="width:100%; height:360px; border:none;" allowfullscreen></iframe></div>`;
                }

                const card = document.createElement('div');
                card.className = 'blog-card';
                card.innerHTML = `
                    <div style="margin-bottom:15px;"><a href="#blog" style="color:var(--accent-color); text-decoration:none; font-size:13px; font-weight:600;">← Tüm Makale Listesine Dön</a></div>
                    <h2 style="margin-top:0; color: var(--accent-color); font-size:22px;">${post.title}</h2>
                    <div class="blog-meta">
                        <span>👤 Yazar: <b>${post.author}</b></span>
                        <span>📅 ${post.formattedDate}</span>
                    </div>
                    <div class="blog-content">${parseMarkdownBold(post.content)}</div>
                    
                    <!-- Dinamik Multimedya Havuzu -->
                    ${mediaHtml}
                    
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin:20px 0;">
                    <h4 style="margin:0 0 10px 0; font-size:15px; color:var(--accent-color);">Yorumlar</h4>
                    
                    <div id="comments-list-${post.id}" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; max-height:220px; overflow-y:auto; padding-right:5px;">
                        <span style="font-size:12px; color:var(--text-muted); font-style:italic;">Yorumlar yükleniyor...</span>
                    </div>
                    
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="comment-input-${post.id}" placeholder="Düşüncelerinizi buraya yazın..." style="margin:0; padding:10px 12px; font-size:13px; height:38px;">
                        <button onclick="window.addBlogComment('${post.id}')" style="padding:0 16px; font-size:13px; margin:0; white-space:nowrap; height:38px; display:flex; align-items:center; justify-content:center;">Gönder</button>
                    </div>
                `;
                blogPostsWrapper.appendChild(card);

                const commentsQ = query(collection(db, `blogs/${post.id}/comments`), orderBy("createdAt", "asc"));
                const unsubComments = onSnapshot(commentsQ, (commentSnap) => {
                    const listEl = document.getElementById(`comments-list-${post.id}`);
                    if (!listEl) return; listEl.innerHTML = '';
                    if (commentSnap.empty) {
                        listEl.innerHTML = `<div style="font-size:12px; color:var(--text-muted); font-style:italic;">Henüz yorum yapılmamış. İlk yorumu siz yazın!</div>`;
                        return;
                    }
                    commentSnap.forEach(cDoc => {
                        const cData = cDoc.data();
                        listEl.innerHTML += `
                            <div style="background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:8px; border-left:2px solid var(--accent-color); font-size:13px; word-break:break-word;">
                                <b style="color:var(--accent-color);">${cData.author}:</b> ${cData.text}
                            </div>
                        `;
                    });
                    listEl.scrollTop = listEl.scrollHeight;
                });
                window.activeCommentUnsubs.push(unsubComments);

            } else {
                blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--danger-color);">⚠️ İstenen makale bulunamadı! <a href="#blog" style="color:var(--accent-color);">Listeye Dön</a></div>`;
            }
        } else {
            // 🛡️ AKILLI ROL KORUMASI: Kullanıcı rütbesindekiler yazma panelini asla göremez
            if (blogWritePanel) {
                if (user.role === 'kurucu' || user.role === 'maker') {
                    blogWritePanel.classList.remove('hidden');
                } else {
                    blogWritePanel.classList.add('hidden');
                }
            }

            localBlogCache.forEach(post => {
                const card = document.createElement('div');
                card.className = 'blog-card';
                card.innerHTML = `
                    <h2 style="margin-top:0; color: var(--accent-color); font-size:18px; cursor:pointer; line-height:1.4;" onclick="window.location.hash='#blog#${post.customId}'">${post.title}</h2>
                    <div class="blog-meta" style="margin-bottom:0;">
                        <span>👤 Yazar: <b>${post.author}</b></span>
                        <span>📅 ${post.formattedDate}</span>
                        <span style="color:var(--accent-color); cursor:pointer; font-weight:600; font-size:12px; text-decoration:underline;" onclick="window.location.hash='#blog#${post.customId}'">Devamını Oku & Multimedya İçerik →</span>
                    </div>
                `;
                blogPostsWrapper.appendChild(card);
            });
        }
    };

    // 📥 KÜRESEL BLOG VERİ TABANI DİNLEYİCİSİ
    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        localBlogCache = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let dateObj = new Date();
            if (data.createdAt) {
                if (typeof data.createdAt.toDate === 'function') dateObj = data.createdAt.toDate();
                else dateObj = new Date(data.createdAt);
            }
            const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            let customId = data.customId;
            if (!customId) {
                let numericHash = "";
                for (let i = 0; i < docSnap.id.length; i++) { numericHash += docSnap.id.charCodeAt(i).toString(); }
                customId = numericHash.substring(0, 12);
            }

            localBlogCache.push({
                id: docSnap.id,
                customId: customId,
                title: data.title,
                content: data.content,
                imageUrl: data.imageUrl || null,
                videoUrl: data.videoUrl || null,
                author: data.author,
                formattedDate: formattedDate
            });
        });

        if (!isInitialLoad && localStorage.getItem('corebase_notifications') === 'true') {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && Notification.permission === "granted") {
                    new Notification("CoreBase", { body: `📰 Yeni İçerik Yayında: ${change.doc.data().title}`, icon: 'site_profile.png' });
                }
            });
        }
        isInitialLoad = false;
        window.refreshBlogRender();
    });

    window.addBlogComment = async function(blogId) {
        const input = document.getElementById(`comment-input-${blogId}`);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return alert(`Lütfen boş bir yorum göndermeyin, ${user.nick}!`);

        try {
            await addDoc(collection(db, `blogs/${blogId}/comments`), {
                author: user.nick, uid: user.uid, text: text, createdAt: Date.now()
            });
            input.value = '';
        } catch(e) { alert("Yorum iletim hatası: " + e.message); }
    };

    // 📤 DETAYLANDIRILMIŞ VE MULTIMEDYA DESTEKLİ BLOG OLUŞTURUCU MOTOR
    window.createNewBlogPost = async function() {
        const titleInput = document.getElementById('blogTitleInput');
        const contentInput = document.getElementById('blogContentInput');
        const imgInput = document.getElementById('blogImgInput');
        const videoInput = document.getElementById('blogVideoInput');
        
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const imageUrl = imgInput ? imgInput.value.trim() : '';
        const videoUrl = videoInput ? videoInput.value.trim() : '';
        
        if (!title || !content) return alert(`Lütfen başlık ve makale içeriğini eksiksiz doldurun, ${user.nick}!`);

        const customId = Math.floor(100000000000 + Math.random() * 900000000000).toString();

        try {
            await addDoc(collection(db, "blogs"), {
                title: title,
                content: content,
                imageUrl: imageUrl,
                videoUrl: videoUrl,
                customId: customId,
                author: user.nick,
                uid: user.uid,
                createdAt: new Date()
            });
            titleInput.value = ''; contentInput.value = '';
            if(imgInput) imgInput.value = ''; if(videoInput) videoInput.value = '';
            alert("Görsel ve video destekli makaleniz başarıyla sisteme işlendi.");
            window.location.hash = "#blog";
        } catch (error) { alert("Yayınlama hatası: " + error.message); }
    };
}
