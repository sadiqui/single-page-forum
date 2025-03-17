// Launch once the DOM is loaded to dynamically insert elements
document.addEventListener("DOMContentLoaded", async () => {
    document.body.insertAdjacentHTML("beforeend", socialForm);
    LoadTheme();
    if (sessionStorage.getItem("socialModalShown") === null || sessionStorage.getItem("socialModalShown") === "false") {
        SocialSignUp();
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
    try {
        const res = await fetch("/api/check-session");
        if (res.ok) {
            const data = await res.json();
            if (data.loggedIn) {
                Username = data.username;
                ProfilePic = data.profile_pic;
                ShowLoggedInNav(data.username, data.profile_pic);
                showOnlineUsers()
                Routing();
                checkNotificationCount();
                connectNotificationsWS();
                connectUsersWS()
                connectMessagesWS()
            }
        } else {
            ShowloginSignup();
            HomeRedirect();
            imageUploaded("profilePic");
        }
    } catch (err) {
        console.log(err);
        PopError("Something went wrong.");
    }
}

// Redirect user to home when on signup/login page 
async function HomeRedirect() {
    if (window.location.pathname !== "/") {
        window.location.href = "/";
    }
}

async function Routing() {
    const path = window.location.pathname;
    if (path === "/") {
        const tabBar = document.getElementById("tabBar");
        if (!tabBar) return;
        tabBar.innerHTML = tabBarHTML;
        SetupTabListeners();
    } else if (path.startsWith("/post")) {
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
    } else if (path.startsWith("/profile")) {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get("user");
        if (userId) {
            const exists = await checkUser(userId);
            if (exists) {
                LoadProfilePage(userId);
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
            window.addEventListener('scroll', handleHistoryScroll);
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
        } else if (tab === "profile") {
            profileRenderer(Username);
            // profileRenderer();
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
    }, 100); // Matches fade-out duration
}
