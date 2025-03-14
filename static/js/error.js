let popThrottle = false;

// Append an error to the form
function DisplayError(id, formElem, text) {
    const errorEl = document.createElement("div");
    errorEl.id = id;
    errorEl.className = "error-message";
    errorEl.textContent = text;
    formElem.appendChild(errorEl);
}

// Remove error (so they don't accumulate when using DisplayError)
function RemoveError(id, formElem) {
    const existing = document.getElementById(id);
    if (existing && formElem.contains(existing)) {
        existing.remove();
    }
}

// Pop up a fading notifation error.
function PopError(message) {
    // If a notification is already being shown, exit early
    if (popThrottle) {
        return;
    }

    popThrottle = true;

    const errorNotification = document.createElement('div');
    errorNotification.className = "error-notification";
    errorNotification.textContent = message;

    document.body.appendChild(errorNotification);
    setTimeout(() => {
        errorNotification.style.opacity = '0';
        errorNotification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            errorNotification.remove();
            popThrottle = false;
        }, 500);
    }, 3000);
}

// Reset modal's forms and error messages after closing
function ResetModal() {
    document.getElementById("signUpForm")?.reset();
    document.getElementById("loginForm")?.reset();
    const signUpError = document.getElementById("signUpErrorMsg");
    if (signUpError) signUpError.textContent = "";
    const loginError = document.getElementById("loginErrorMsg");
    if (loginError) loginError.textContent = "";

    document.querySelectorAll(".toggle-password").forEach(button => {
        const passwordInput = document.getElementById(button.dataset.target);
        const icon = button.querySelector("img");
        const isDark = document.documentElement.classList.contains("dark-mode");
        passwordInput.type = "password";
        icon.src = isDark ? "../img/show-dark.png" : "../img/show-light.png";
    });
}

// Focus on field that triggered the error
function FocusOnField(errMsg) {
    const fieldMap = {
        email: "signUpEmail",
        username: "signUpUsername",
        password: "signUpPassword"
    };

    for (const [key, fieldId] of Object.entries(fieldMap)) {
        if (errMsg.includes(key)) {
            document.getElementById(fieldId)?.focus();
        }
    }
}

function LoadNotFoundPage() {
    // Fetch page content dynamically, similar to "display: block";
    fetch("https://gist.githubusercontent.com/kinoz01/6fed8332121b3be5ba6bb957a3498f88/raw/08b09cdd8f75a07d373ad494126f5b401fcece48/gistfile1.txt")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch content");
            }
            return response.text();
        })
        .then(html => {
            // Render fetched-treated content
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const title = doc.querySelector("title");
            if (title) title.textContent = "dwi 404";

            const h1 = doc.querySelector("h1");
            if (h1) h1.textContent = "404";

            const h3 = doc.querySelector("h3");
            if (h3) h3.textContent = "Looks like you're lost!";

            const p = doc.querySelector("p");
            if (p) p.textContent = "The page you are looking for is not available!";

            document.documentElement.replaceWith(doc.documentElement);
        })
        .catch(error => {
            console.error("Error loading content:", error);
        });

}
