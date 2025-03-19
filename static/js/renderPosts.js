// Renders a list of post objects into #postsContainer.
// if clearFirst we first remove content inside it.
function RenderPosts(posts, offset, truncate = 300) {
    let postsContainer = ""
    if (window.location.pathname === "/profile") {
        postsContainer = document.getElementById("profileDynamicContent");
    } else if (tabName === "history") {
        postsContainer = document.getElementById("historyDynamicContent");
    } else if (tabName === "home") {
        postsContainer = document.getElementById("content");
    }

    // No need for further logic
    if (!postsContainer) {
        return;
    }

    // If offset = 0 clear the container
    if (offset == 0) {
        postsContainer.innerHTML = "";
    }

    if (!posts || posts.length === 0) {
        return;
    }

    posts.forEach((post) => {
        const postDiv = document.createElement("div");
        postDiv.classList.add("post-card");
        postDiv.setAttribute("data-id", post.id);

        post.content = truncateContent(post.content, truncate);
        RenderPost(post, postDiv);
        postsContainer.appendChild(postDiv);

        // e.g. single-post click
        postDiv.addEventListener("click", (e) => {
            if (e.target.closest(".reaction-buttons") ||
                e.target.closest(".post-title") ||
                e.target.closest(".user-avatar") ||
                e.target.closest(".username-select")) return;
            // Then go to single post
            document.querySelector("#tagFilterSection").style.display = "none";
            history.pushState(null, "", `/post?post_id=${post.id}`);
            const tabBar = document.querySelector(".tab-bar");
            if (tabBar) { tabBar.style.display = "none"; }
            Routing();
        });

        FetchReactions(post.id, postDiv, "post")
    });
    RedirectToProfile()
    longTagNames()
}

// Build post html (user in getPosts and singlePost)
function RenderPost(post, postDiv, single = "") {
    const profilePic = post.profile_pic || "../img/avatar.webp";

    // Build categories HTML
    const categoriesHTML = (post.categories || [])
        .map(
            (cat) => `
                <div class="post-tags">
                    <img src="../img/tag-icon.svg" alt="Tag icon" class="tag-icon">
                    <span>${cat.name}</span>
                </div>`
        )
        .join("");

    // Prepare image HTML
    let imageSection = "";
    if (post.image && post.image !== "") {
        imageSection = `
        <div id="${single}PostImage" class="post-image-wrapper">
            <img class="post-image-centered" src="../uploads/${post.image}" alt="Post Image">
        </div>
    `;
    }

    // Start building HTML  
    postDiv.innerHTML = `
        <!-- Post Header -->
        <div class="post-header">
            <img src="../uploads/${profilePic}" alt="User Avatar" class="user-avatar">
            <div class="user-info">
                <div class="username">
                    <span class="username-select">${post.username}</span>
                    <span class="time-ago" data-timestamp="${post.created_at}">&nbsp• ${timeAgo(post.created_at)}</span>
                </div>
            </div>
            <div class="post-tags-container">${categoriesHTML}</div>
        </div>

        <!-- Post Content + Image -->
        <div class="post-content" id="${single}postContent">
            <h1 id="${single}postTitle" class="post-title">
                <a href="/post?post_id=${post.id}" class="post-header-link">${post.title}</a>
            </h1>
            <p style="white-space: pre-wrap">${post.content}</p>
            ${imageSection}
        </div>

        <!-- Reaction Buttons -->
        <div class="reaction-buttons">
            <div class="reaction-item">
                <button class="reaction-button post-like-button">
                    <img class="post-like-icon" src="../img/like.svg" alt="like">
                </button>
                <span class="post-like-count">0</span>
            </div>

            <div class="reaction-item">
                <button class="reaction-button post-dislike-button">
                    <img class="post-dislike-icon" src="../img/dislike.svg" alt="dislike">
                </button>
                <span class="post-dislike-count">0</span>
            </div>
        </div>

        <!-- Comments Counts -->
        <div class="reaction-item" id="${single}comments-counts">
            <button class="reaction-button comment-button">
                <img id="comment-icon" src="../img/comments.png" alt="Comments">
            </button>
            <span class="comments-count">0</span>
        </div>
    `;

    // Remove link from single post's title
    if (window.location.pathname.startsWith("/post")) {
        const titleLink = document.querySelector(".post-header-link");
        titleLink.removeAttribute("href");
        titleLink.style.pointerEvents = "none";
    }

    AttachReactionListeners(post.id, postDiv, "post")
    FetchCommentsCount(post.id, postDiv)
    updateTagIcons()
    if (currentHistoryTab == "comments" && window.location.pathname === "/") {
        // Create a container for *this user's* comments
        const userCommentsContainer = document.createElement("div");
        userCommentsContainer.id = `userComments-${post.id}`;
        userCommentsContainer.classList.add("user-comments-scroll");

        // Insert it into the DOM (say, at the bottom of the postDiv)
        postDiv.appendChild(userCommentsContainer);

        // Now fetch the user's comments for this post
        getUserComments(post.id);
    }
}

// This function will be called for each post when you're on the "comments" tab.
async function getUserComments(postId) {
    try {
        const res = await fetch(`/api/user-post-comments?post_id=${postId}`);
        if (!res.ok) {
            console.error("Failed to fetch user comments for post:", postId);
            return;
        }

        // Parse the returned JSON array of comments
        const comments = await res.json();

        // Find the scrollable div we created in RenderPost
        const container = document.getElementById(`userComments-${postId}`);
        if (!container) {
            console.warn("No container found for user comments on post:", postId);
            return;
        }

        // Render those comments into that container
        RenderUserComments(comments, container);
    } catch (err) {
        console.error("Error fetching user comments:", err);
    }
}

function RenderUserComments(comments, container) {
    // Clear whatever was there
    container.innerHTML = "";

    if (!comments || comments.length === 0) {
        container.innerHTML = `<p>No comments yet!</p>`;
        return;
    }

    // Loop through each comment, build markup, append
    comments.forEach((comment) => {
        const profilePic = comment.profile_pic || "../img/avatar.webp";
        const commentEl = document.createElement("div");
        commentEl.classList.add("comment-item");

        commentEl.innerHTML = `
            <p class="comment-meta">
                <div class="username">
                    <img src="../uploads/${profilePic}" alt="User Avatar" class="comment-user-avatar">
                    ${comment.username}
                    <span class="time-ago" data-timestamp="${comment.created_at}">
                        &nbsp• ${timeAgo(comment.created_at)}
                    </span>
                </div>
            </p>
            <p class="comment-content">${comment.content}</p>

            <!-- Reaction Section for each comment -->
            <div class="comment-reaction-buttons">
                <button class="reaction-button comment-like-button">
                    <img class="comment-like-icon" src="../img/like.svg" alt="like">
                </button>
                <span class="comment-like-count">0</span>

                <button class="reaction-button comment-dislike-button">
                    <img class="comment-dislike-icon" src="../img/dislike.svg" alt="dislike">
                </button>
                <span class="comment-dislike-count">0</span>
            </div>
        `;

        container.appendChild(commentEl);

        // If you want to reuse your comment reaction logic:
        FetchReactions(comment.id, commentEl, "comment");
        AttachReactionListeners(comment.id, commentEl, "comment");
    });
}

// Fetch comments count
async function FetchCommentsCount(postId, postDiv) {
    try {
        const res = await fetch(`/api/comments-count?post_id=${postId}`);
        if (!res.ok) {
            const errData = await res.json();
            console.error(errData.msg);
            PopError("Something went wrong")
            return;
        }
        const data = await res.json();
        const commentsCount = postDiv.querySelector(".comments-count");
        commentsCount.textContent = data.count || 0;
    } catch (err) {
        console.error(err);
    }
}

// Make sure very longs tags don't break the style
function longTagNames() {
    document.querySelectorAll(".post-tags-container").forEach(tagsContainer => {
        // Check if the width of post-tags-container is greater than 300px
        if (tagsContainer.offsetWidth > 500) {
            tagsContainer.style.position = "relative";
            tagsContainer.style.top = "auto";
            tagsContainer.style.right = "auto";
            tagsContainer.style.marginLeft = "auto";
            tagsContainer.style.display = "flex";
            tagsContainer.style.justifyContent = "right";
            tagsContainer.style.maxWidth = "500px";
        }
    });
}