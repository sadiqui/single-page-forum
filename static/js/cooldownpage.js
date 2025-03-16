function updateCountdown() {
    const lastReloadTime = parseInt(localStorage.getItem("lastReloadTime") || "0", 10);
    const cooldownTime = 7000; // 7 seconds
    const now = Date.now();
    const timeLeft = cooldownTime - (now - lastReloadTime);
    const remainingSeconds = Math.max(0, Math.ceil(timeLeft / 1000));
    
    const countdownElement = document.getElementById("countdown");
    if (!countdownElement) return; // Safety check
    
    countdownElement.textContent = remainingSeconds + " seconds";

    if (remainingSeconds <= 0) {
        // Check with server before allowing navigation
        fetch('/api/cooldown-status')
            .then(response => {
                if (response.status === 429) {
                    // Still in cooldown according to server
                    return response.json().then(data => {
                        if (data && data.timeRemaining) {
                            const cooldownStartTime = Date.now() - ((7 - data.timeRemaining) * 1000);
                            localStorage.setItem("lastReloadTime", cooldownStartTime.toString());
                            setTimeout(updateCountdown, 1000);
                        }
                    });
                } else {
                    // Server says we're good to go
                    localStorage.setItem("reloadCount", "0");
                    localStorage.removeItem("lastReloadTime");
                    
                    // Retrieve lastPage and redirect
                    let lastPage = sessionStorage.getItem("lastPage");
                    sessionStorage.removeItem("lastPage");
                    window.location.href = lastPage || "/";
                }
            })
            .catch(error => {
                console.error('Error checking cooldown status:', error);
                // Fallback to local behavior on error
                localStorage.setItem("reloadCount", "0");
                localStorage.removeItem("lastReloadTime");
                let lastPage = sessionStorage.getItem("lastPage");
                sessionStorage.removeItem("lastPage");
                window.location.href = lastPage || "/";
            });
    } else {
        setTimeout(updateCountdown, 1000); // Recheck each second
    }
}

updateCountdown();
