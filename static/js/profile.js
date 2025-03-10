let currentProfileTab = "liked"; // or "liked" or "info"
let profileOffset = 0;
// Loading flag to prevent overlapping fetches (throttle)
let profileisLoading = false;

function profileRenderer(username) {
    const dynamicContent = document.getElementById("content");
    dynamicContent.innerHTML = "";

    dynamicContent.innerHTML = `
        <div class="content-section">
            <div class="profile-card">
                <div class="profile-div"></div>
                <div class="profile-image">
                    <img src="../img/avatar.webp"
                        alt="Profile Picture" />
                </div>
                <div class="username">${username}</div>
                <nav class="profile-tab-bar">
                    <button class="profile-tab-btn active" data-tab="liked">
                        <img src="../img/liked.svg" alt="liked">
                        <span class="profile-tab-txt">Liked</span>
                    </button>
                    <button class="profile-tab-btn" data-tab="disliked">
                        <img src="../img/disliked.svg" alt="disliked">
                        <span class="profile-tab-txt">Disliked</span>
                    </button>
                    <button class="profile-tab-btn" data-tab="posts">
                        <img src="../img/posts.svg" alt="Posts">
                        <span class="profile-tab-txt">Posts</span>
                    </button>
                    <button class="profile-tab-btn" data-tab="comments">
                        <img src="../img/comments.svg" alt="comments">
                        <span class="profile-tab-txt">Comments</span>
                    </button>
                </nav>
                <div id="profileDynamicContent"></div>
            </div>
        </div>
    `;
    SetupProfileTabListeners()
    // Listen for scroll => infinite loading
    window.addEventListener("scroll", handleProfileScroll, { passive: true });
}


function SetupProfileTabListeners() {
    const tabButtons = document.querySelectorAll(".profile-tab-btn");
    const dynamicContent = document.getElementById("profileDynamicContent");

    tabButtons.forEach(button => {
        button.addEventListener("click", function () {
            const scrollPos = window.scrollY; // Save current scroll position

            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));

            // Add active class to clicked button
            this.classList.add("active");
            dynamicContent.innerHTML = "";

            // Get the tab name
            const tabName = this.getAttribute("data-tab");
            profileOffset = 0;
            profileisLoading = false;

            if (tabName === "liked") {
                currentProfileTab = "liked"
                fetchLikedPosts(profileOffset, "like").then(() => {
                    window.scrollTo(0, scrollPos); // Restore scroll position
                });
            } else if (tabName === "disliked") {
                currentProfileTab = "disliked"
                fetchLikedPosts(profileOffset, "dislike").then(() => {
                    window.scrollTo(0, scrollPos); // Restore scroll position
                });
            } else if (tabName === "posts") {
                currentProfileTab = "posts"
                fetchUserPosts(profileOffset).then(() => {
                    window.scrollTo(0, scrollPos);
                });
            } else if (tabName === "comments") {
                // messagesRenderer(offset);
            }
        });
    });

    // By default, trigger the "Posts" button
    const defaultInfoBtn = document.querySelector('.profile-tab-btn[data-tab="posts"]');
    if (defaultInfoBtn) {
        defaultInfoBtn.click();
    }
}

/* -------------------------------
        FETCH LIKED/Disliked POSTS
----------------------------------*/
async function fetchLikedPosts(profileOffset, reaction) {
    const dynamicContent = document.getElementById("profileDynamicContent");
    try {
        const res = await fetch(`/api/user-liked-posts?offset=${profileOffset}&reaction=${reaction}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && profileOffset == 0) {
            dynamicContent.innerHTML = `No ${reaction}d posts!`
            return
        }

        RenderPosts(posts, profileOffset, 100);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading posts.");
    }
}

/* -----------------------
   FETCH USER POSTS
-------------------------*/
async function fetchUserPosts(profileOffset) {
    const dynamicContent = document.getElementById("dynamicContent");

    try {
        const res = await fetch(`/api/user-posts?offset=${profileOffset}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && profileOffset == 0) {
            dynamicContent.innerHTML = "No posts yet!"
            return
        }
        RenderPosts(posts, profileOffset, 100);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading user posts.");
    }
}

/* -------------------
   SCROLL HANDLER
--------------------*/
function handleProfileScroll() {

    // Already loading => skip
    if (profileisLoading) return;

    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    // If close to bottom, fetch more
    if (scrollY + windowHeight >= docHeight - 400) {
        profileisLoading = true;

        if (currentProfileTab === "posts") {
            fetchUserPosts(profileOffset)
                .then(() => {
                    profileOffset += ProfileLimit; // increment offset
                })
                .finally(() => {
                    profileisLoading = false;
                });
        } else if (currentProfileTab === "liked") {
            fetchLikedPosts(profileOffset)
                .then(() => {
                    profileOffset += ProfileLimit;
                })
                .finally(() => {
                    profileisLoading = false;
                });
        } else if (currentProfileTab === "disliked") {
            fetchLikedPosts(profileOffset)
                .then(() => {
                    profileOffset += ProfileLimit;
                })
                .finally(() => {
                    profileisLoading = false;
                });
        }
    }
}