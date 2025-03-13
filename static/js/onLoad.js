// Launch once the DOM is loaded to dynamically insert elements
document.addEventListener("DOMContentLoaded", async () => {
    document.body.insertAdjacentHTML("beforeend", socialForm)
    LoadTheme();
    if (sessionStorage.getItem("socialModalShown") === null || sessionStorage.getItem("socialModalShown") === "false") {
        SocialSignUp();
    }
    try {
        // Load html inside body.
        document.body.insertAdjacentHTML("beforeend", LoginForm)
        document.body.insertAdjacentHTML("beforeend", NewPostForm)

        await CheckSession();
        AuthListener();
        NavBarListener();
        LoginFormListener();
        SignUpFormListener();
        NewPostListener();
        imageUploaded("formPostImage");
        CheckOAuth()

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
                ProfilePic = data.profile_pic
                ShowLoggedInNav(data.username, data.profile_pic);
                Routing()
            }
        } else {
            ShowloginSignup()
            imageUploaded("profilePic")
        }
    } catch (err) {
        console.log(err);
        PopError("Something went wrong.")
    }
}

function Routing() {
    if (window.location.pathname === "/") {
        document.getElementById("tabBar").innerHTML = tabBarHTML;
        SetupTabListeners()
    }
    if (window.location.pathname.startsWith("/post")) {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get("post_id");
        LoadPostPage(postId);
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
            currentProfileTab = "";
            clearTagFilter();
            homeRenderer();
            FilterCategories();
        } else if (tab === "profile") {
            profileRenderer(Username);
        } else if (tab === "notifs") {
            window.addEventListener("scroll", handleNotifScroll, { passive: true });
            notifOffset = 0;
            notifsRenderer();
        } else if (tab === "messages") {
            // messagesRenderer(offset);
        } else if (tab === "settings") {
            // settingsRenderer();
        }

        // Animate opacity from 0 to 1 smoothly
        let opacity = 0;
        dynamicContent.style.opacity = opacity;

        function fadeIn() {
            opacity += 0.1; // Increase opacity gradually
            dynamicContent.style.opacity = opacity;

            if (opacity < 1) {
                requestAnimationFrame(fadeIn); // Continue animation
            }
        }

        requestAnimationFrame(fadeIn); // Start fade-in effect
    }, 200); // Matches fade-out duration
}

// Handle Back/Forward Button Clicks
window.addEventListener("popstate", () => {
    if (window.location.pathname.startsWith("/post")) {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get("post_id");
        LoadPostPage(postId);
    } else {
        window.location.href = "/";
    }
});
