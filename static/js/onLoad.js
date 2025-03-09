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
            // ShowLoggedOutNav()
            document.getElementById("authModal").classList.remove("hidden");
            document.getElementById("loginContainer").classList.remove("hidden");
            document.getElementById("signUpContainer").classList.add("hidden");
            const maleBtn = document.getElementById("maleBtn");
            const femaleBtn = document.getElementById("femaleBtn");
            const genderInput = document.getElementById("genderInput");

            function selectGender(gender) {
                if (gender === "male") {
                    maleBtn.classList.add("active");
                    femaleBtn.classList.remove("active");
                } else {
                    femaleBtn.classList.add("active");
                    maleBtn.classList.remove("active");
                }
                genderInput.value = gender; // Set hidden input value
            }

            maleBtn.addEventListener("click", () => selectGender("male"));
            femaleBtn.addEventListener("click", () => selectGender("female"));
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
        // NewPostListener();
        // imageUploaded();
        CheckOAuth()

    } catch (err) {
        console.log(err);
    }
})