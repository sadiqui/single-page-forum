/***********************************************
* Fetch signup handler and handle signup logic *
************************************************/
async function HandleSignUp(e) {
    e.preventDefault();
    RemoveError("signUpErrorMsg", e.target);

    const formData = new FormData();
    formData.append("email", document.getElementById("signUpEmail").value);
    formData.append("username", document.getElementById("signUpUsername").value);
    formData.append("password", document.getElementById("signUpPassword").value);
    formData.append("first_name", document.getElementById("firstName").value);
    formData.append("last_name", document.getElementById("lastName").value);
    formData.append("age", document.getElementById("age").value);
    formData.append("gender", document.getElementById("genderInput").value);

    // Get the selected image file
    const profilePic = document.getElementById("profilePic").files[0];
    if (profilePic) {
        formData.append("profile_pic", profilePic);
    }

    try {
        const res = await fetch("/api/signup", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const errData = await res.json();
            DisplayError("signUpErrorMsg", e.target, errData.msg);
            FocusOnField(errData.msg);
        } else {
            localStorage.setItem("justLoggedIn", "true");
            HandleLogin(e, signUpUsername, signUpPassword);
        }
    } catch (err) {
        DisplayError("signUpErrorMsg", e.target, "Wrong image format or network unavailable");
    }
}

/*********************************************
* Fetch login handler and handle login logic *
**********************************************/
async function HandleLogin(e, loginCred, loginPassword) {
    RemoveError("loginErrorMsg", e.target)

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                login: loginCred.value,
                password: loginPassword.value,
            }),
        });
        if (!res.ok) {
            const errData = await res.json()
            DisplayError("loginErrorMsg", e.target, errData.msg);
        } else {
            window.location.href = "/";
        }
    } catch (err) {
        DisplayError("loginErrorMsg", e.target, "Network error occurred");
    }
}

/***********************************************
* Fetch logout handler and handle logout logic *
************************************************/
async function HandleLogout() {
    try {
        const res = await fetch("/api/logout", { method: "POST" });
        if (!res.ok) {
            const errData = await res.json()
            console.log(errData.msg);
            PopError("Something went wrong.")
        } else {
            window.location.href = "/";
        }
    } catch (err) {
        console.log(err);
        PopError("Something went wrong.")
    }
}

// Hide social OAuth buttons if necessary env variables aren't available.
function CheckOAuth() {
    fetch('/api/social-check')
        .then(response => response.json())
        .then(data => {
            const googleBtns = document.querySelectorAll('.google-btn');
            const githubBtns = document.querySelectorAll('.github-btn');
            const socialLoginDivs = document.querySelectorAll('.social-login');
            const separatorDivs = document.querySelectorAll('.separator');

            // If Google isn't configured, hide all Google buttons
            if (!data.hasGoogle) {
                googleBtns.forEach(btn => btn.style.display = 'none');
            }

            // If GitHub isn't configured, hide all GitHub buttons
            if (!data.hasGithub) {
                githubBtns.forEach(btn => btn.style.display = 'none');
            }

            // If neither Google nor GitHub is configured, hide social login sections
            if (!data.hasGoogle && !data.hasGithub) {
                socialLoginDivs.forEach(div => div.style.display = 'none');
                separatorDivs.forEach(div => div.style.display = 'none');
            }
        })
        .catch(error => {
            console.error('Error checking OAuth:', error);
        });
}