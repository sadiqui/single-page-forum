let currentProfileTab = ""; // or "liked"...
let profileOffset = 0;
// Loading flag to prevent overlapping fetches (throttle)
let profileisLoading = false;

function profileRenderer(username) {
    const dynamicContent = document.getElementById("content");
    dynamicContent.innerHTML = "";

    dynamicContent.innerHTML = `
        <div class="content-section">
            <div class="profile-card">
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
                        <span class="profile-tab-txt">My Posts</span>
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
    SetupImageUpdate()
    SetupProfileTabListeners()
    // Listen for scroll => infinite loading
    if (tabName === "profile") {
        window.addEventListener("scroll", handleProfileScroll, { passive: true });
    }
}

// Handles Profile tabs clicks.
function SetupProfileTabListeners() {
    const tabButtons = document.querySelectorAll(".profile-tab-btn");
    const dynamicContent = document.getElementById("profileDynamicContent");

    tabButtons.forEach(button => {
        button.addEventListener("click", function () {
            const scrollPos = window.scrollY; // Save current click scroll position

            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));

            // Add active class to clicked button
            this.classList.add("active");
            dynamicContent.innerHTML = "";

            // Get the tab name
            const profileTab = this.getAttribute("data-tab");
            profileOffset = 0;
            profileisLoading = false;

            if (profileTab === "liked") {
                currentProfileTab = "liked"
                fetchLikedPosts(profileOffset, "like").then(() => {
                    window.scrollTo(0, scrollPos); // Restore scroll position
                });
            } else if (profileTab === "disliked") {
                currentProfileTab = "disliked"
                fetchLikedPosts(profileOffset, "dislike").then(() => {
                    window.scrollTo(0, scrollPos); // Restore scroll position
                });
            } else if (profileTab === "posts") {
                currentProfileTab = "posts"
                fetchUserPosts(profileOffset).then(() => {
                    window.scrollTo(0, scrollPos);
                });
            } else if (profileTab === "comments") {
                currentProfileTab = "comments"
                fetchCommentedPosts(profileOffset).then(() => {
                    window.scrollTo(0, scrollPos);
                });
            }
        });
    });

    // By default, trigger the "liked" button
    const defaultInfoBtn = document.querySelector('.profile-tab-btn[data-tab="liked"]');
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
    const dynamicContent = document.getElementById("profileDynamicContent");

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

/*-------------------------
   FETCH Commented POSTS
---------------------------*/
async function fetchCommentedPosts(profileOffset) {
    const dynamicContent = document.getElementById("profileDynamicContent");

    try {
        const res = await fetch(`/api/user-commented-posts?offset=${profileOffset}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && profileOffset == 0) {
            dynamicContent.innerHTML = "No comments yet!"
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
        } else if (currentProfileTab === "comments") {
            fetchCommentedPosts(profileOffset)
                .then(() => {
                    profileOffset += ProfileLimit;
                })
                .finally(() => {
                    profileisLoading = false;
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
                // If server responded with an error, read it
                const errText = await res.text();
                PopError("Error updating picture (1mb max-size)");
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
        } catch (err) {
            console.error("Network error:", err);
            PopError("Network error while updating profile picture");
        }
    });
}
