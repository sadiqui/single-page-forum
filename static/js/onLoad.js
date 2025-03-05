// Fetch the logged in user from session cookie.
async function CheckSession() {
    try {
        const res = await fetch("/api/check-session");
        if (res.ok) {
            const data = await res.json();
            if (data.loggedIn) {
                ShowLoggedInNav(data.username, data.profilePic);
            }
        } else {
            ShowLoggedOutNav()
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
        await CheckSession();
        // Load html inside body.
        document.body.insertAdjacentHTML("beforeend", LoginForm)
        document.body.insertAdjacentHTML("beforeend", NewPostForm)

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