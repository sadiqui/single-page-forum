// Launch once the DOM is loaded to dynamically insert elements
document.addEventListener("DOMContentLoaded", async () => {
    document.body.insertAdjacentHTML("beforeend", socialForm);
    LoadTheme();
    // If the "social_email" cookie exists it means a social signup is pending.
    if (getCookieValue("social_email")) {
        SocialSignUp();
        return
    }

    try {
        // Load html inside body.
        document.body.insertAdjacentHTML("beforeend", LoginForm);
        document.body.insertAdjacentHTML("beforeend", NewPostForm);

        await CheckSession();
        AuthListener();
        NavBarListener();
        LoginFormListener();
        SignUpFormListener();
        NewPostListener();
        imageUploaded("formPostImage");
        CheckOAuth();
    } catch (err) {
        console.log(err);
    }
})

// Fetch the logged in user from session cookie.
async function CheckSession() {
    if (window.location.pathname === "/cooldown") return
    try {
        const res = await fetch("/api/check-session");
        if (res.ok) {
            const data = await res.json();
            if (data.loggedIn) {
                Username = data.username;
                ProfilePic = data.profile_pic;
                ShowLoggedInNav(data.username, data.profile_pic);
                showOnlineUsers();
                Routing();
                checkNotificationCount();
                connectNotificationsWS();
                connectUsersWS();
                connectMessagesWS();
            }
        } else {
            ShowloginSignup();
            imageUploaded("profilePic");
        }
    } catch (err) {
        console.log(err);
        PopError("Something went wrong.");
    }
}

async function Routing() {
    const path = window.location.pathname;
    if (path !== "/") {
        const tagFilterSection = document.getElementById("tagFilterSection");
        if (tagFilterSection) {
            tagFilterSection.style.display = "none";
        }
        const tabBar = document.querySelector(".tab-bar")
        if (tabBar) tabBar.style.display = "none";
        window.removeEventListener('scroll', handleScroll);
    }
    if (path === "/post" || path === "/profile") {
        window.removeEventListener('scroll', handleHistoryScroll);
    }
    if (path === "/") {
        const tabBar = document.getElementById("tabBar");
        if (!tabBar) return;
        tabBar.innerHTML = tabBarHTML;
        tabName = "home";
        SetupTabListeners();
    } else if (path === "/post") {
        currentHistoryTab = "";
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get("post_id");
        if (postId) {
            const exists = await checkPost(postId);
            if (exists) {
                LoadPostPage(postId);
            } else {
                LoadNotFoundPage();
            }
        } else {
            LoadNotFoundPage();
        }
    } else if (path === "/profile") {
        currentHistoryTab = "";
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get("user");

        if (username) {         
            const exists = await checkUser(username);
            if (exists) {
                LoadProfilePage(username);
            } else {
                LoadNotFoundPage();
            }
        } else {
            LoadNotFoundPage();
        }
    } else if (path === "/cooldown") {
        cooldownRenderer();
    } else {
        LoadNotFoundPage();
    }
}

function SetupTabListeners() {
    const tabButtons = document.querySelectorAll(".tab-btn");

    // Set "Home" as the default active tab on page load
    const defaultTab = document.querySelector('.tab-btn[data-tab="home"]');
    if (defaultTab) {
        defaultTab.classList.add("active");
        LoadTabContent("home"); // Load home content on start
    }

    tabButtons.forEach(button => {
        button.addEventListener("click", function () {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));

            // Add active class to clicked button
            this.classList.add("active");

            // Get the tab name
            tabName = this.getAttribute("data-tab");

            // Call function to change content
            LoadTabContent(tabName);
        });
    });
}

function LoadTabContent(tab) {
    // If we're on the "home" tab, add the filter UI at the top (only once, when offset=0)
    if (tabName === "home") {
        const tagFilterSection = document.getElementById("tagFilterSection");
        if (tagFilterSection) {
            tagFilterSection.style.display = "block"; // Show the filter UI
        }
    } else {
        // Hide the filter UI when not in "home" tab
        const tagFilterSection = document.getElementById("tagFilterSection");
        if (tagFilterSection) {
            tagFilterSection.style.display = "none";
        }
    }
    const dynamicContent = document.getElementById("content");

    // Fade out old content
    dynamicContent.style.opacity = "0";
    dynamicContent.innerHTML = "";

    // Wait for fade-out to complete before changing content
    setTimeout(() => {
        // Load new content based on tab
        if (tab === "home") {
            window.removeEventListener('scroll', handleHistoryScroll);
            currentHistoryTab = "";
            clearTagFilter();
            homeRenderer();
            FilterCategories();
        } else if (tab === "history") {
            window.removeEventListener('scroll', handleScroll);
            historyRenderer(Username);
        } else if (tab === "notifs") {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleHistoryScroll);
            notifOffset = 0;
            notifsRenderer();
        } else if (tab === "messages") {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleHistoryScroll);
            loadLastConversation();
        }

        // Animate opacity from 0 to 1 smoothly
        let opacity = 0;
        dynamicContent.style.opacity = opacity;

        function fadeIn() {
            opacity += 0.2; // Increase opacity gradually
            dynamicContent.style.opacity = opacity;

            if (opacity < 1) {
                requestAnimationFrame(fadeIn); // Continue animation
            }
        }

        requestAnimationFrame(fadeIn); // Start fade-in effect
    }, 100); // fade out
}

// Handle navigation per authentication state
window.addEventListener("popstate", async () => {
    try {
        const res = await fetch("/api/check-session");
        if (res.ok) {
            const data = await res.json();
            // Allow normal navigation
            if (data.loggedIn) {
                Routing();
                return;
            }
        }
    } catch (err) {
        console.error("Error checking session:", err);
    }
});

// Serve single post when clicking his title, without refresh
document.addEventListener("click", (event) => {
    // Get HTML <a> tag
    const link = event.target.closest(".post-header-link");
    if (!link) return;

    // Extract the URL
    event.preventDefault();
    const url = link.getAttribute("href");

    // Update URL and load post dynamically
    history.pushState(null, "", url);
    Routing();

    // Remove home-specific elements
    document.querySelector("#tagFilterSection").style.display = "none";
    const tabBar = document.querySelector(".tab-bar");
    if (tabBar) { tabBar.style.display = "none"; }
});

// Serve profile from navbar menu, without any refresh
// navbar takes time to load, so we observe DOM changes
// attach event listener as soon as avatar-menu is added
const observer = new MutationObserver((mutationsList, observer) => {
    const avatarMenu = document.querySelector(".avatar-menu");
    if (avatarMenu) {
        // Attach the event listener
        avatarMenu.addEventListener("click", (event) => {
            // Get HTML <a> tag
            const link = event.target.closest("#profile a");
            if (!link) return;

            // Extract the URL
            event.preventDefault();
            const url = link.getAttribute("href");

            // Update URL and load profile dynamically
            history.pushState(null, "", url);
            Routing();
        });

        // Stop observing once the element is found
        observer.disconnect();
    }
});

// Start observing the document for changes
observer.observe(document.body, { childList: true, subtree: true });
