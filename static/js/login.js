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
            window.location.reload();
        }
    } catch (err) {
        DisplayError("loginErrorMsg", e.target, "Network error occurred");
    }
}