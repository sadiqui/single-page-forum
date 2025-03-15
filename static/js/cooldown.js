window.addEventListener("beforeunload", (event) => {
    // Check if we're in cooldown before incrementing
    const lastCooldown = parseInt(localStorage.getItem("lastReloadTime") || "0", 10);
    const now = Date.now();
    const cooldownTime = 7000; // 7 seconds
    
    // Only increment if NOT in cooldown
    if (!(lastCooldown && now - lastCooldown < cooldownTime)) {
        const currentCount = parseInt(localStorage.getItem("reloadCount") || "0", 10);
        localStorage.setItem("reloadCount", currentCount + 1);
    } else {
        // If in cooldown, prevent the page from reloading
        event.preventDefault(); // Needs better UX
        return '';
    }
});

window.addEventListener("DOMContentLoaded", () => {
    const currentCount = parseInt(localStorage.getItem("reloadCount") || "0", 10);
    const lastCooldown = parseInt(localStorage.getItem("lastReloadTime") || "0", 10);
    const now = Date.now();
    const cooldownTime = 7000; // 7 seconds
    
    // Check if we are in the middle of a cooldown
    if (lastCooldown && now - lastCooldown < cooldownTime) {
        cooldownRenderer();
        return; // Prevent other scripts from running
    }
    
    if (currentCount > 7) {
        // Reset counter and store start time
        localStorage.setItem("reloadCount", 0);
        localStorage.setItem("lastReloadTime", now.toString());
        // Store last visited page
        sessionStorage.setItem("lastPage", window.location.href);
        
        // Apply cooldown
        cooldownRenderer();
        return; // Exit early
    }
});

// Reset if reload isn't within 7 seconds
setInterval(() => {
    const lastReload = parseInt(localStorage.getItem("lastReloadTime") || "0", 10);
    const now = Date.now();
    // Only reset if we're not in an active cooldown
    if (now - lastReload > 7000) {
        localStorage.setItem("reloadCount", "0");
    }
}, 7000);

function cooldownRenderer() {
    // Replace the body content
    document.body.innerHTML = `
        <div id="cooldown-container">
            <h1>Too Many Requests</h1></br>
            <p>Please wait before accessing the page again.</p>
            <p>Time remaining: <span id="countdown"></span></p>
        </div>
    `;
    
    // Intercept navigation attempts during cooldown
    window.addEventListener('click', interceptNavigation, true);
    window.addEventListener('submit', interceptNavigation, true);
    
    // Load the cooldown counter logic
    const script = document.createElement('script');
    script.src = "../js/cooldownpage.js";
    document.body.appendChild(script);
}

// Intercept navigation attempts during cooldown
function interceptNavigation(event) {
    const lastCooldown = parseInt(localStorage.getItem("lastReloadTime") || "0", 10);
    const now = Date.now();
    if (now - lastCooldown < 7000) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
}

// Handle history navigation attempts
window.addEventListener('popstate', function(event) {
    const lastCooldown = parseInt(localStorage.getItem("lastReloadTime") || "0", 10);
    const now = Date.now();
    if (now - lastCooldown < 7000) {
        event.preventDefault();
        history.pushState(null, '', window.location.href);
        return false;
    }
});