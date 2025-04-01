let currentActivityTab = "";
let activityOffset = 0;
// Loading flag to prevent overlapping fetches (throttle)
let activityIsLoading = false;
let endActivityFetch = false;

function activityRenderer(username) {
    const dynamicContent = document.getElementById("content");
    dynamicContent.innerHTML = "";
    dynamicContent.innerHTML = `
        <div class="content-section">
            <div class="activity-card">
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
                <nav class="activity-tab-bar">
                    <button class="activity-tab-btn active" data-tab="liked">
                        <img src="../img/liked.svg" alt="liked">
                        <span class="activity-tab-txt">Liked</span>
                    </button>
                    <button class="activity-tab-btn" data-tab="disliked">
                        <img src="../img/disliked.svg" alt="disliked">
                        <span class="activity-tab-txt">Disliked</span>
                    </button>
                    <button class="activity-tab-btn" data-tab="posts">
                        <img src="../img/posts.svg" alt="Posts">
                        <span class="activity-tab-txt">My Posts</span>
                    </button>
                    <button class="activity-tab-btn" data-tab="comments">
                        <img src="../img/comments.svg" alt="comments">
                        <span class="activity-tab-txt">Comments</span>
                    </button>
                </nav>
                <div id="activityDynamicContent"></div>
            </div>
        </div>
    `;
    SetupActivityTabListeners();
    SetupImageUpdate();

    // Retrieve and activate the last used tab
    const savedTab = getTabForSection('activity');
    const tabToActivate = document.querySelector(`.activity-tab-btn[data-tab="${savedTab}"]`);

    if (tabToActivate) {
        document.querySelector(`.activity-tab-btn[data-tab="liked"]`).classList.remove('active');
        tabToActivate.classList.add('active');
        currentActivityTab = savedTab;

        conditionalTabs(0); // Trigger the tab loading
    }

    // Listen for scroll => infinite loading
    if (tabName === "activity") {
        window.addEventListener("scroll", handleActivityScroll, { passive: true });
    }
}

// Handles Activity tabs clicks.
function SetupActivityTabListeners() {
    const tabButtons = document.querySelectorAll(".activity-tab-btn");

    tabButtons.forEach(button => {
        button.addEventListener("click", function () {            
            endActivityFetch = false;
            endProfileFetch = false;
            const scrollPos = window.scrollY; // Save current click scroll position

            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));

            // Add active class to clicked button
            this.classList.add("active");

            // Get the tab name
            currentActivityTab = this.getAttribute("data-tab");

            // Save to unified storage
            saveTabState('activity', currentActivityTab);

            activityOffset = 0;
            activityIsLoading = false;

            conditionalTabs(scrollPos)
        });
    });
}

// Helper function, render according tab
function conditionalTabs(scrollPos) {
    const dynamicContent = document.getElementById("activityDynamicContent"); // Adjust based on your actual container

    if (!dynamicContent) return; // Prevent errors if the element is missing

    // Fade out current content
    dynamicContent.style.opacity = "0";

    // Wait for fade-out to complete before fetching new content
    setTimeout(() => {
        dynamicContent.innerHTML = "";
        const actions = {
            liked: () => fetchLikedPosts(activityOffset, "like"),
            disliked: () => fetchLikedPosts(activityOffset, "dislike"),
            posts: () => fetchUserPosts(activityOffset, "activityDynamicContent"),
            comments: () => fetchCommentedPosts(activityOffset),
        };

        if (actions[currentActivityTab]) {
            actions[currentActivityTab]().then(() => {
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
async function fetchLikedPosts(activityOffset, reaction) {
    if (endActivityFetch) return
    const dynamicContent = document.getElementById("activityDynamicContent");
    try {
        const res = await fetch(`/api/user-liked-posts?offset=${activityOffset}&reaction=${reaction}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && activityOffset == 0) {
            dynamicContent.innerHTML = `<div id="emptyTabimg">
            <img src="../img/empty-chat.png" alt="No posts">
                <p>No ${reaction}d posts!</p>
            </div>`
            return
        }
        if (!posts || posts.length == 0) {
            endActivityFetch = true
            return
        }

        RenderPosts(posts, activityOffset, 100);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading posts.");
    }
}

/*-------------------------
   FETCH Commented POSTS
---------------------------*/
async function fetchCommentedPosts(activityOffset) {
    if (endActivityFetch) return
    const dynamicContent = document.getElementById("activityDynamicContent");

    try {
        const res = await fetch(`/api/user-commented-posts?offset=${activityOffset}`);
        if (!res.ok) return;

        const posts = await res.json();
        if ((!posts || posts.length == 0) && activityOffset == 0) {
            dynamicContent.innerHTML = `<div id="emptyTabimg">
            <img src="../img/empty-chat.png" alt="No comments">
                <p>No comments yet!</p>
            </div>`
            return
        }
        if (!posts || posts.length == 0) {
            endActivityFetch = true
            return
        }
        RenderPosts(posts, activityOffset, 100);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading user posts.");
    }
}

/* -------------------
   SCROLL HANDLER
--------------------*/
function handleActivityScroll() {

    // Already loading => skip
    if (activityIsLoading) return;

    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    // If close to bottom, fetch more
    if (scrollY + windowHeight >= docHeight - 400) {
        activityIsLoading = true;

        if (currentActivityTab === "posts") {
            fetchUserPosts(activityOffset, "activityDynamicContent")
                .then(() => {
                    activityOffset += ActivityLimit; // increment offset
                })
                .finally(() => {
                    activityIsLoading = false;
                });
        } else if (currentActivityTab === "liked") {
            fetchLikedPosts(activityOffset, "like")
                .then(() => {
                    activityOffset += ActivityLimit;
                })
                .finally(() => {
                    activityIsLoading = false;
                });
        } else if (currentActivityTab === "disliked") {
            fetchLikedPosts(activityOffset, "dislike")
                .then(() => {
                    activityOffset += ActivityLimit;
                })
                .finally(() => {
                    activityIsLoading = false;
                });
        } else if (currentActivityTab === "comments") {
            fetchCommentedPosts(activityOffset)
                .then(() => {
                    activityOffset += ActivityLimit;
                })
                .finally(() => {
                    activityIsLoading = false;
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
                activityOffset = 0;
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
