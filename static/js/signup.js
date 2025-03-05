async function HandleSignUp(e) {
    e.preventDefault();
    RemoveError("signUpErrorMsg", e.target)

    const signUpEmail = document.getElementById("signUpEmail");
    const signUpUsername = document.getElementById("signUpUsername");
    const signUpPassword = document.getElementById("signUpPassword");

    try {
        const res = await fetch("/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: signUpEmail.value,
                username: signUpUsername.value,
                password: signUpPassword.value,
            }),
        })
        if (!res.ok) {
            const errData = await res.json()
            DisplayError("signUpErrorMsg", e.target, errData.msg)
            FocusOnField(errData.msg);
        } else {
            localStorage.setItem('justLoggedIn', 'true')
            HandleLogin(e, signUpUsername, signUpPassword)
        }
    } catch (err) {
        DisplayError("signUpErrorMsg", e.target, "Network error occurred");
    }
}