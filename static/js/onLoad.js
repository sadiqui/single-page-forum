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
    const dynamicContent = document.getElementById("content");
    dynamicContent.innerHTML = "";
    if (tab === "home") {
        currentProfileTab = ""
        clearTagFilter()
        homeRenderer();
        // Then call filter handler
        FilterCategories()
    } else if (tab === "profile") {
        profileRenderer(Username);
    } else if (tab === "notifs") {
        // notifsRenderer(offset);
    } else if (tab === "messages") {
        // messagesRenderer(offset);
    } else if (tab === "settings") {
        // settingsRenderer();
    }
}

// Handle Refresh: Check URL and Load Correct Content
window.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.startsWith("/post")) {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get("post_id");
        LoadPostPage(postId);
    }
});

// // Handle browser back/forward navigation
// window.addEventListener("popstate", () => {
//     const params = new URLSearchParams(window.location.search);
//     const username = params.get("user");
//     if (username) {
//         profileRenderer(username);
//     } else {
//         homeRenderer();
//     }
// });

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
