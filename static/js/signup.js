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
        DisplayError("signUpErrorMsg", e.target, "Network error occurred");
    }
}
