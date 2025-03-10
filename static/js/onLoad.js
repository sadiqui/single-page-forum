// Fetch the logged in user from session cookie.
async function CheckSession() {
    try {
        const res = await fetch("/api/check-session");
        if (res.ok) {
            const data = await res.json();
            if (data.loggedIn) {
                USRNAME = data.username;
                ShowLoggedInNav(data.username, data.profilePic);
                document.getElementById("tabBar").innerHTML = tabBarHTML;
                SetupTabListeners();
            }
        } else {
            ShowloginSignup()
        }
    } catch (err) {
        console.log(err);
        PopError("Something went wrong.")
    }
}

// Launch once the DOM is loaded to dynamically insert elements
document.addEventListener("DOMContentLoaded", async () => {
    document.body.insertAdjacentHTML("beforeend", socialForm)
    LoadTheme();
    if (sessionStorage.getItem("socialModalShown") === null || sessionStorage.getItem("socialModalShown") === "false") {
        SocialSignUp()
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
        imageUploaded();
        CheckOAuth()

    } catch (err) {
        console.log(err);
    }
})

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
            const tabName = this.getAttribute("data-tab");

            // Call function to change content
            LoadTabContent(tabName);
        });
    });
}

function LoadTabContent(tab) {
    const contentArea = document.getElementById("content"); // Ensure this exists in your HTML
    if (tab === "home") {
        // homeRenderer(offset);
    } else if (tab === "filter") {
        // filterRenderer(offset);
    } else if (tab === "profile") {
        profileRenderer(USRNAME);
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
    const params = new URLSearchParams(window.location.search);
    const username = params.get("user");
    if (username) {
        profileRenderer(username);
    }
});

// Handle browser back/forward navigation
window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const username = params.get("user");
    if (username) {
        profileRenderer(username);
    } else {
        homeRenderer();
    }
});