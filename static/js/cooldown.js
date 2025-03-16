// Only attach the reload counter on non-cooldown pages
if (!window.location.pathname.includes("cooldown")) {
    window.addEventListener("beforeunload", incrementReloadCount);
}
function incrementReloadCount() {
    const currentCount = parseInt(localStorage.getItem("reloadCount") || "0", 10);
    localStorage.setItem("reloadCount", currentCount + 1); // increment on reload
};

window.addEventListener("DOMContentLoaded", () => {
    // Skip all reload counting logic on cooldown page
    if (window.location.pathname.includes("cooldown")) {
        cooldownRenderer();
        return;
    }

    const currentCount = parseInt(localStorage.getItem("reloadCount") || "0", 10);
    const lastCooldown = parseInt(localStorage.getItem("lastReloadTime") || "0", 10);
    const now = Date.now();
    const cooldownTime = 7000; // 7 seconds

    // Make sure cooldown is applied even on a different tab 
    // (check if we are in the middle of a cooldown)
    if (lastCooldown && now - lastCooldown < cooldownTime) {
        window.location.href = "/cooldown";
        return;
    }

    if (currentCount > 7) {
        // Reset counter and store start time
        localStorage.setItem("reloadCount", 0);
        localStorage.setItem("lastReloadTime", now.toString());

        // Redirect only if not already on cooldown page
        if (!window.location.pathname.includes("cooldown")) {
            // Store last visited page before redirecting
            sessionStorage.setItem("lastPage", window.location.href);
            window.location.href = "/cooldown";
        }
    }
});

// Reset if reload isn't within 7 seconds
setInterval(() => {
    localStorage.setItem("reloadCount", 0);
}, 7000);

function cooldownRenderer() {
    // Remove any existing beforeunload listener
    window.removeEventListener("beforeunload", incrementReloadCount);

    // Fetch the cooldown status from the server
    // Replace the body content
    document.body.innerHTML = `
    <div id="cooldown-container">
        <h1>Too Many Requests</h1></br>
        <p>Please wait before accessing the page again.</p>
        <p>Time remaining: <span id="countdown"></span></p>
    </div>
    `;

    // Prevent F5 and Ctrl+R without showing alerts
    document.addEventListener("keydown", function (e) {
        if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
            e.preventDefault();
            return false;
        }
    });

    // Disable right-click context menu that contains reload option
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // Check with the server for cooldown status
    fetch('/api/cooldown-status')
        .then(response => response.json())
        .then(data => {
            // If server provides a timeRemaining, use it
            if (data && data.timeRemaining) {
                // Calculate when the cooldown started based on time remaining
                const cooldownStartTime = Date.now() - ((7 - data.timeRemaining) * 1000);
                localStorage.setItem("lastReloadTime", cooldownStartTime.toString());
            }
            // Load the cooldown counter logic
            const script = document.createElement('script');
            script.src = "../js/cooldownpage.js";
            document.body.appendChild(script);
        })
        .catch(error => {
            console.error('Error fetching cooldown status:', error);
            // Fall back to local cooldown timing if server request fails
            const script = document.createElement('script');
            script.src = "../js/cooldownpage.js";
            document.body.appendChild(script);
        });
}