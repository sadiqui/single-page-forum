let currentHistoryTab = ""; // or "liked"...
let historyOffset = 0;
// Loading flag to prevent overlapping fetches (throttle)
let historyisLoading = false;

function historyRenderer(username) {
    const dynamicContent = document.getElementById("content");
    dynamicContent.innerHTML = "";
    dynamicContent.innerHTML = `
        <div class="content-section">
            <div class="history-card">
                <div class="profile-image">
                    <img src="../uploads/${ProfilePic}"
                        alt="Profile Picture" />
                        <!-- Label for uploading a new picture -->
                        <label for="profilePic" class="edit-btn">
                            <img src="../img/camera.svg" alt="Change Profile Picture" />
                        </label>

                        <!-- Hidden file input -->
                        <input
                            type="file"
                            id="profilePic"
                            accept="image/*"
                        />
                </div>
                <div class="profileUsername username">${username}</div>
                <nav class="history-tab-bar">
                    <button class="history-tab-btn active" data-tab="liked">
                        <img src="../img/liked.svg" alt="liked">
                        <span class="history-tab-txt">Liked</span>
                    </button>
                    <button class="history-tab-btn" data-tab="disliked">
                        <img src="../img/disliked.svg" alt="disliked">
                        <span class="history-tab-txt">Disliked</span>
                    </button>
                    <button class="history-tab-btn" data-tab="posts">
                        <img src="../img/posts.svg" alt="Posts">
                        <span class="history-tab-txt">My Posts</span>
                    </button>
                    <button class="history-tab-btn" data-tab="comments">
                        <img src="../img/comments.svg" alt="comments">
                        <span class="history-tab-txt">Comments</span>
                    </button>
                </nav>
                <div id="historyDynamicContent"></div>
            </div>
        </div>
    `;
    SetupHistoryTabListeners();
    SetupImageUpdate();
    // Listen for scroll => infinite loading
    if (tabName === "history") {
        window.addEventListener("scroll", handleHistoryScroll, { passive: true });
    }
}

// Handles History tabs clicks.
function SetupHistoryTabListeners() {
    const tabButtons = document.querySelectorAll(".history-tab-btn");

    tabButtons.forEach(button => {
        button.addEventListener("click", function () {
            const scrollPos = window.scrollY; // Save current click scroll position

            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));

            // Add active class to clicked button
            this.classList.add("active");

            // Get the tab name
            currentHistoryTab = this.getAttribute("data-tab");
            historyOffset = 0;
            historyisLoading = false;

            conditionalTabs(scrollPos)
        });
    });

    // By default, trigger the "liked" button
    const defaultInfoBtn = document.querySelector('.history-tab-btn[data-tab="liked"]');
    if (defaultInfoBtn) {
        defaultInfoBtn.click();
    }
}

// Helper function, render according tab
function conditionalTabs(scrollPos) {
    const dynamicContent = document.getElementById("historyDynamicContent"); // Adjust based on your actual container

    if (!dynamicContent) return; // Prevent errors if the element is missing

    // Fade out current content
    dynamicContent.style.opacity = "0";

    // Wait for fade-out to complete before fetching new content
    setTimeout(() => {
        dynamicContent.innerHTML = "";
        const actions = {
            liked: () => fetchLikedPosts(historyOffset, "like"),
            disliked: () => fetchLikedPosts(historyOffset, "dislike"),
            posts: () => fetchUserPosts(historyOffset),
            comments: () => fetchCommentedPosts(historyOffset),
        };

        if (actions[currentHistoryTab]) {
            actions[currentHistoryTab]().then(() => {
                setTimeout(() => {
                    window.scrollTo({ top: scrollPos, behavior: "smooth" });

                    // Animate fade-in effect
                    let opacity = 0;
                    function fadeIn() {
                        opacity += 0.1; // Increase opacity gradually
                        dynamicContent.style.opacity = opacity;

                        if (opacity < 1) {
                            requestAnimationFrame(fadeIn); // Continue animation
                        }
                    }
                    requestAnimationFrame(fadeIn); // Start fade-in effect
                }, 100); // Small delay to ensure content loads
            });
        }
    }, 100); // Matches fade-out duration
}


/* -------------------------------
        FETCH LIKED/Disliked POSTS
----------------------------------*/
async function fetchLikedPosts(historyOffset, reaction) {
    const dynamicContent = document.getElementById("historyDynamicContent");
    try {
        const res = await fetch(`/api/user-liked-posts?offset=${historyOffset}&reaction=${reaction}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && historyOffset == 0) {
            dynamicContent.innerHTML = `<div id="emptyTabimg">
            <img src="../img/empty-chat.png" alt="Empty chat">
                <p>No ${reaction}d posts!</p>
            </div>`
            return
        }

        RenderPosts(posts, historyOffset, 100);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading posts.");
    }
}

/* -----------------------
   FETCH USER POSTS
-------------------------*/
async function fetchUserPosts(historyOffset) {
    const dynamicContent = document.getElementById("historyDynamicContent");

    try {
        const res = await fetch(`/api/user-posts?offset=${historyOffset}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && historyOffset == 0) {
            dynamicContent.innerHTML = `<div id="emptyTabimg">
            <img src="../img/empty-chat.png" alt="Empty chat">
                <p>No posts yet!</p>
            </div>`
            return
        }
        RenderPosts(posts, historyOffset, 100);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading user posts.");
    }
}

/*-------------------------
   FETCH Commented POSTS
---------------------------*/
async function fetchCommentedPosts(historyOffset) {
    const dynamicContent = document.getElementById("historyDynamicContent");

    try {
        const res = await fetch(`/api/user-commented-posts?offset=${historyOffset}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && historyOffset == 0) {
            dynamicContent.innerHTML = `<div id="emptyTabimg">
            <img src="../img/empty-chat.png" alt="Empty chat">
                <p>No comments yet!</p>
            </div>`
            return
        }
        RenderPosts(posts, historyOffset, 100);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading user posts.");
    }
}

/* -------------------
   SCROLL HANDLER
--------------------*/
function handleHistoryScroll() {

    // Already loading => skip
    if (historyisLoading) return;

    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    // If close to bottom, fetch more
    if (scrollY + windowHeight >= docHeight - 400) {
        historyisLoading = true;

        if (currentHistoryTab === "posts") {
            fetchUserPosts(historyOffset)
                .then(() => {
                    historyOffset += HistoryLimit; // increment offset
                })
                .finally(() => {
                    historyisLoading = false;
                });
        } else if (currentHistoryTab === "liked") {
            fetchLikedPosts(historyOffset, "like")
                .then(() => {
                    historyOffset += HistoryLimit;
                })
                .finally(() => {
                    historyisLoading = false;
                });
        } else if (currentHistoryTab === "disliked") {
            fetchLikedPosts(historyOffset, "dislike")
                .then(() => {
                    historyOffset += HistoryLimit;
                })
                .finally(() => {
                    historyisLoading = false;
                });
        } else if (currentHistoryTab === "comments") {
            fetchCommentedPosts(historyOffset)
                .then(() => {
                    historyOffset += HistoryLimit;
                })
                .finally(() => {
                    historyisLoading = false;
                });
        }
    }
}

// Handle editing/updating profile picture.
function SetupImageUpdate() {
    const fileInput = document.getElementById("profilePic");
    if (!fileInput) return;

    // Triggered when the user selects a file
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return; // No file selected

        const formData = new FormData();
        formData.append("profile_pic", file);

        try {
            const res = await fetch("/api/update-profile-pic", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                PopError("Invalid picture format or size (1mb max-size)");
                return;
            }
            const data = await res.json(); // Get JSON response
            if (!data.profile_pic) {
                PopError("Invalid response from server");
                return;
            }
            // Update the image source with the new file from the server
            const imgElement = document.querySelector(".profile-image img");
            if (imgElement) {
                imgElement.src = `../uploads/${data.profile_pic}`;
            }
            if (document.querySelector(".avatar-menu img")) {
                document.querySelector(".avatar-menu img").src = `../uploads/${data.profile_pic}`;
            }

            ProfilePic = `${data.profile_pic}`;

            // Re-render dynamic content
            setTimeout(() => { // (used to show comments image when changed)
                historyOffset = 0;
                const scrollPos = window.scrollY;
                window.scrollTo(0, scrollPos);
                conditionalTabs(scrollPos);
            }, 1000);
        } catch (err) {
            console.error("Network error:", err);
            PopError("Invalid picture or Network error");
        }
    });
}
