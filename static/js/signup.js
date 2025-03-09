async function HandleSignUp(e) {
    e.preventDefault();
    RemoveError("signUpErrorMsg", e.target);

    // Get form fields
    const signUpEmail = document.getElementById("signUpEmail");
    const signUpUsername = document.getElementById("signUpUsername");
    const signUpPassword = document.getElementById("signUpPassword");
    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const age = document.getElementById("age");
    const genderInput = document.getElementById("genderInput");

    try {
        const res = await fetch("/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: signUpEmail.value.trim(),
                username: signUpUsername.value.trim(),
                password: signUpPassword.value.trim(),
                first_name: firstName.value.trim(),
                last_name: lastName.value.trim(),
                age: parseInt(age.value, 10), // Convert age to number
                gender: genderInput.value.trim(), // Should be "male" or "female"
            }),
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
        DisplayError("signUpErrorMsg", e.target, "Network error occurred");
    }
}
