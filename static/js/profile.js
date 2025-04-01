let profileOffset = 0;
let profileIsLoading = false;
let currentProfileTab = "";
let ProfileLimit = 6; // Consistent with activity tab
let endProfileFetch = false;
let scrollProfile;

// Change click behaviour on username/image under posts.
function RedirectToProfile() {
    document.querySelectorAll(".user-avatar, .username-select, .comment-user-avatar")
        .forEach(element => {
            element.addEventListener("click", (event) => {
                event.preventDefault(); // Prevent default link behavior

                // First, check if it's inside a post or a comment
                let usernameElement = null;
                let parentContainer = element.closest(".post-header") || element.closest(".username");

                if (parentContainer) {
                    usernameElement = parentContainer.querySelector(".username-select");
                }

                // If usernameElement is still null, exit
                if (!usernameElement) return;

                // Extract raw text (ignoring child elements)
                const username = usernameElement.childNodes[0]?.nodeValue?.trim();
                if (!username) return;

                // Redirect to the profile page
                history.pushState(null, "", `/profile?user=${encodeURIComponent(username)}`);
                Routing()
            });
        });
}

function RedirectToChatProfile() {
    document.querySelectorAll(".chat-profile-pic, #chatUsername")
        .forEach(element => {
            element.addEventListener("click", (event) => {
                event.preventDefault(); // Prevent default behavior

                // Find the closest #chatHeader (ensures we're in the right section)
                const chatHeader = element.closest("#chatHeader");
                if (!chatHeader) return;

                // Get username from #chatUsername
                const usernameElement = chatHeader.querySelector("#chatUsername");
                if (!usernameElement) return;

                // Extract raw text (ignoring child elements)
                const username = usernameElement.childNodes[0]?.nodeValue?.trim();
                if (!username) return;

                // Construct the custom profile URL
                history.pushState(null, "", `/profile?user=${encodeURIComponent(username)}`);
                Routing()
            });
        });
}

// Quickly check if user exists.
async function checkUser(username) {
    try {
        const res = await fetch(`/api/check-user?username=${encodeURIComponent(username)}`);

        if (!res.ok) {
            console.warn("Request failed:", res.statusText);
            return false;
        }

        const data = await res.json();
        return data.exists; // Returns boolean from the API

    } catch (err) {
        console.error("Error checking user:", err);
        PopError("Something went wrong");
        return false;
    }
}

// Load the profile page.
async function LoadProfilePage(username) {
    try {
        const res = await fetch(`/api/get-profile-info?username=${encodeURIComponent(username)}`);
        if (!res.ok) {
            const errData = await res.json();
            console.error("Failed to fetch profile:", errData.msg);
            PopError("Something went wrong");
        } else {
            const profile = await res.json();
            RenderProfile(profile);
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
        PopError("Something went wrong");
    }
}

// Centralized tab rendering logic
function renderProfileTabs(profile, tabName) {
    const dynamicContent = document.getElementById("profileDynamicContent");
    profileOffset = 0;

    const tabContentMap = {
        "about": () => `
            <div class="about-section">
                <p><strong>First Name:</strong> ${profile.first_name || "N/A"}</p>
                <p><strong>Last Name:</strong> ${profile.last_name || "N/A"}</p>
                <p><strong>Gender:</strong> ${profile.gender || "N/A"}</p>
                <p><strong>Age:</strong> ${profile.age || "N/A"}</p>
            </div>
        `,
        "profile-posts": () => {
            profileIsLoading = false;
            dynamicContent.innerHTML = `<p>Loading ${profile.username}'s posts...</p>`;
            fetchUserPosts(profileOffset, "profileDynamicContent");
            return ""; // No static content for posts
        }
    };

    // Use the mapping or default to empty string
    const contentRenderer = tabContentMap[tabName] || (() => "");
    dynamicContent.innerHTML = contentRenderer();
}

// Render the profile page dynamically
function RenderProfile(profile) {
    const dynamicContent = document.getElementById("content");
    if (!dynamicContent) return;

    dynamicContent.innerHTML = `
        <div class="content-section">
            <div class="profile-card">
                <div class="profile-image">
                    <img src="../uploads/${profile.profile_pic || "avatar.webp"}" alt="Profile Picture" />
                </div>
                <div class="profileUsername username">${profile.username}</div>
                <nav class="profile-tab-bar">
                    <button class="profile-tab-btn active" data-tab="about">
                        <img src="../img/about.svg" alt="about">
                        <span class="profile-tab-txt">About</span>
                    </button>
                    <button class="profile-tab-btn" data-tab="profile-posts">
                        <img src="../img/posts.svg" alt="Posts">
                        <span class="profile-tab-txt">Posts</span>
                    </button>
                </nav>
                <div id="profileDynamicContent"></div>
            </div>
        </div>
    `;

    // Add the scroll listener (for infinite posts loading)  
    window.addEventListener("scroll", handleProfileScroll, { passive: true })

    // Setup tab listeners
    SetupProfileTabListeners(profile);

    // Retrieve and activate the last used tab
    const savedTab = getTabForSection('profile');
    const tabToActivate = document.querySelector(`.profile-tab-btn[data-tab="${savedTab}"]`);

    if (tabToActivate) {
        document.querySelector(`.profile-tab-btn[data-tab="about"]`).classList.remove('active');
        tabToActivate.classList.add('active');
        currentProfileTab = savedTab;

        // Trigger the tab loading
        renderProfileTabs(profile, savedTab);
    }
}

// Setup event listeners for profile tabs
function SetupProfileTabListeners(profile) {
    const tabButtons = document.querySelectorAll(".profile-tab-btn");
    tabButtons.forEach(button => {
        button.addEventListener("click", function () {
            endProfileFetch = false;
            endActivityFetch = false;

            // remove active from all
            tabButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            currentProfileTab = this.getAttribute("data-tab");

            // Save to unified storage
            saveTabState('profile', currentProfileTab);

            // Render content for the selected tab
            renderProfileTabs(profile, currentProfileTab);
        });
    });
}

// Fetch user posts for both
// profile and activity tab.
async function fetchUserPosts(offset, content) {    
    // profileDynamicContent
    const dynamicContent = document.getElementById(content);
    if (!dynamicContent || endProfileFetch || endActivityFetch) return;

    try {
        const query = `/api/get-user-posts?offset=${offset}`;
        const res = await fetch(query);

        if (!res.ok) return;
        const posts = await res.json();

        // If offset=0 and no posts, show empty image
        if ((!posts || posts.length === 0) && offset === 0) {
            dynamicContent.innerHTML = `<div id="emptyTabimg">
            <img src="../img/empty-chat.png" alt="No posts">
                <p>No posts yet!</p>
            </div>`;
            return;
        }
        if (!posts || posts.length === 0) {
            endProfileFetch = true;
            return;
        }

        // If offset=0, replace the entire dynamicContent first
        if (offset === 0) dynamicContent.innerHTML = "";

        RenderPosts(posts, offset, 100);
    } catch (err) {
        console.error("Error loading user posts:", err);
        DisplayError("errMsg", dynamicContent, "Error loading user posts.");
    }
}

// Check scroll position on each "scroll" event.
// If close to bottom, load more posts (lazy loading).
function handleProfileScroll() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("user");

    // If we're already loading, skip
    if (profileIsLoading) return;

    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    // If close to bottom...
    if (scrollY + windowHeight >= docHeight - 400) {
        // only if we're on the "profile-posts" tab
        if (currentProfileTab === "profile-posts") {
            profileIsLoading = true;
            fetchUserPosts(profileOffset, "profileDynamicContent")
                .then(() => {
                    profileOffset += ProfileLimit;
                })
                .finally(() => {
                    profileIsLoading = false;
                });
        }
    }
}
