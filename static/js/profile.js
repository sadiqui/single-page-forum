// Change click behaviour on username/image under posts.
function RedirectToProfile() {
    document.querySelectorAll(".user-avatar, .username-select")
        .forEach(element => {
            element.addEventListener("click", (event) => {
                event.preventDefault(); // Prevent default link behavior

                // Find the closest .post-header (ensures we're in the right post)
                const postHeader = element.closest(".post-header");
                if (!postHeader) return;

                // Find the username inside .post-header
                const usernameElement = postHeader.querySelector(".username-select");
                if (!usernameElement) return;

                // Get only the raw text (ignoring child elements like icons/spans)
                const username = usernameElement.childNodes[0]?.nodeValue?.trim();
                if (!username) return;

                // Construct the custom profile URL
                const customURL = `/profile?user=${encodeURIComponent(username)}`;

                // Redirect to the custom profile page
                window.location.href = customURL;
            });
        });
}

// Quickly check if user exists.
async function checkUser(id) {
    try {
        const res = await fetch(`/api/check-user?user_id=${encodeURIComponent(id)}`);
        if (!res.ok) {            
            return false;
        } else {
            return true;
        }
    } catch (err) {
        console.warn(err);
        PopError("Something went wrong")
        return false;
    }
}