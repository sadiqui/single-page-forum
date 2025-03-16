// Utility function to refresh all reactions
function RefreshReactions() {
    // Get all elements that have data-id
    const allPostDivs = document.querySelectorAll(".post-card[data-id]");

    allPostDivs.forEach((postEl) => {
        // Grab the post ID from the data-attribute
        const postID = postEl.getAttribute("data-id");
        if (postID) {
            FetchReactions(postID, postEl, "post");
        }
    });
}

// Utility function to refresh comment counts for all posts
function RefreshCommentsCounts() {
    // Get all elements that have data-id
    const allPostDivs = document.querySelectorAll(".post-card[data-id]");

    allPostDivs.forEach((postEl) => {
        // Grab the post ID from the data-attribute
        const postID = postEl.getAttribute("data-id");
        if (postID) {
            FetchCommentsCount(postID, postEl);
        }
    });
}

// Refresh reactions, comments and posts on each page show (no-reload)
window.addEventListener("pageshow", async (e) => {
    preLoadTheme()
    // The page was restored from BFCache
    if (e.persisted) { 
        // User loggedout and he's trying to get back to profile.
        if  (window.location.href.includes("profile") && localStorage.getItem("loggedOut") === "true") {
            window.location.href = "/";
            localStorage.removeItem("loggedOut");
        }

        RefreshReactions()
        RefreshCommentsCounts()
        if (localStorage.getItem("postCreated") === "true") {
            if (currentHistoryTab == "posts") {
                historyOffset = 0;
                fetchUserPosts(historyOffset)
                    .then(() => {
                        historyOffset += HistoryLimit;
                    })
            } else if (window.location.pathname === "/") {
                offset = 0;
                LoadPosts(offset, selectedTags.join(",")).then(() => {
                    offset += HomeLimit;
                });
            }
            localStorage.removeItem("postCreated"); // clear the marker
        }
        // update liked posts when: click post dislike navigate back
        if (localStorage.getItem("reactionUpdated") === "true" && currentHistoryTab == "liked") {         
            historyOffset = 0;
            fetchLikedPosts(historyOffset, "like")
                .then(() => {
                    historyOffset += HistoryLimit;
                })
            localStorage.removeItem("reactionUpdated"); // clear the marker
        }
        if (localStorage.getItem("reactionUpdated") === "true" && currentHistoryTab == "disliked") {         
            historyOffset = 0;
            fetchLikedPosts(historyOffset, "dislike")
                .then(() => {
                    historyOffset += HistoryLimit;
                })
            localStorage.removeItem("reactionUpdated"); // clear the marker
        }
    }

    // Check if the user just logged in (first time)
    if (localStorage.getItem("justLoggedIn") === "true") {
        welcomeMsg()
        localStorage.removeItem("justLoggedIn");
    }
});