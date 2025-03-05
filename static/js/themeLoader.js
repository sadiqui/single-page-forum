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
    const isDark = document.documentElement.classList.contains('dark-mode');
    const passwordToggles = document.querySelectorAll('.toggle-password');
    passwordToggles.forEach(passwordToggle => {
        const passwordIcon = passwordToggle.querySelector('img');
        if (!passwordIcon) return;

        if (isDark) {
            if (passwordIcon.src.includes('show-light.png')) {
                passwordIcon.src = '../img/show-dark.png';
            } else if (passwordIcon.src.includes('hide-light.png')) {
                passwordIcon.src = '../img/hide-dark.png';
            }
        } else {
            if (passwordIcon.src.includes('show-dark.png')) {
                passwordIcon.src = '../img/show-light.png';
            } else if (passwordIcon.src.includes('hide-dark.png')) {
                passwordIcon.src = '../img/hide-light.png';
            }
        }
    });
}
