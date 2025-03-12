// Preload the theme in page charge by reading from local storage.
function preLoadTheme() {
    // Try to load any saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        // If user has a saved preference, apply it
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-mode');
        } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark-mode')
        }
    } else {
        // Otherwise, check system preference
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (darkModeQuery.matches) {
            document.documentElement.classList.add('dark-mode');
        }
    }
    updateTagIcons()
}

// Switch the tag icon images to dark/light version
function updateTagIcons() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    const newSrc = isDark ? '../img/tag-icon-dark.svg' : '../img/tag-icon.svg';

    // Grab all .tag-icon images and update their src
    document.querySelectorAll('.tag-icon')?.forEach(icon => {
        icon.src = newSrc;
    });
}

// Switch the password toggle icon to dark/light version
function updatePassIcon() {
    const isDark = document.documentElement.classList.contains("dark-mode");
    const passwordToggles = document.querySelectorAll(".toggle-password");

    passwordToggles.forEach((passwordToggle) => {
        const passwordIcon = passwordToggle.querySelector("img");
        const passwordInput = document.getElementById(passwordToggle.dataset.target);

        if (!passwordIcon || !passwordInput) return;

        // Function to check autofill status thoroughly
        const checkAutofill = () => {
            // Multiple detection methods
            const isAutofilled = passwordInput.matches(":-webkit-autofill") ||
                window.getComputedStyle(passwordInput).backgroundColor.includes("#e8f0fe") ||
                passwordInput.classList.contains("autofilled");

            return isAutofilled;
        };

        // Function to update icon based on mode and autofill state
        const updateIcon = () => {
            const isAutofilled = checkAutofill();
            const isHidden = passwordIcon.src.includes("hide");

            if (isDark) {
                if (isAutofilled) {
                    // Always using light icons with autofilled backgrounds
                    passwordIcon.src = isHidden ? "../img/hide-light.png" : "../img/show-light.png";
                } else {
                    // Using dark icons otherwise
                    passwordIcon.src = isHidden ? "../img/hide-dark.png" : "../img/show-dark.png";
                }
            } else {
                // Light mode always uses light icons
                passwordIcon.src = isHidden ? "../img/hide-light.png" : "../img/show-light.png";
            }
        };

        // Update the DOM before checking the autofill state
        passwordToggle.addEventListener("click", () => {
            setTimeout(updateIcon, 10);
        });

        updateIcon(); // Run initially

        // Observe autofill & input changes with more attributes
        const observer = new MutationObserver(updateIcon);
        observer.observe(passwordInput, {
            attributes: true,
            attributeFilter: ["value", "style", "class"]
        });

        // Enhanced event listeners
        passwordInput.addEventListener("focus", updateIcon);
        passwordInput.addEventListener("input", updateIcon);
        passwordInput.addEventListener("change", updateIcon);
        passwordInput.addEventListener("blur", updateIcon);

        // Delayed check to catch autofill on page load
        setTimeout(updateIcon, 100);
    });
}
