// Handle new Post creation.
async function HandleNewPost(e, categories, clearTags) {
    e.preventDefault();
    RemoveError("postErrorMsg", e.target)

    const newPostModal = document.getElementById("newPostModal");
    const titleInput = document.getElementById("formPostTitle");
    const contentInput = document.getElementById("formPostContent");
    const imageInput = document.getElementById("formPostImage");

    let title = titleInput.value.trim();
    let content = contentInput.value.trim();

    // Determine file size (in bytes) if an image is selected
    let imageSize = 0;
    if (imageInput.files && imageInput.files[0]) {
        imageSize = imageInput.files[0].size;
    }

    if (CheckPostSize(content.length, title.length, imageSize, e.target)) {
        return
    }

    try {
        const formData = new FormData();
        formData.append("title", title)
        formData.append("content", content)
        formData.append("categories", JSON.stringify(categories))

        // If an image is selected, attach to FormData
        if (imageInput.files && imageInput.files[0]) {
            formData.append("image", imageInput.files[0]);
        }

        const res = await fetch("/api/create-post", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            RemoveError("postErrorMsg", e.target)
            const errData = await res.json()
            DisplayError("postErrorMsg", e.target, errData.msg);
        } else {
            // Hide modal
            newPostModal.classList.add("hidden");

            // Clear form fields
            titleInput.value = "";
            contentInput.value = "";
            imageInput.value = "";
            document.querySelector(".upload-text").textContent = "Upload Image (optional)";
            clearTags;

            if (window.location.href.includes("profile") && currentTab == "liked") {
                offset = 0;
                fetchLikedPosts(offset)
                    .then(() => {
                        offset += ProfileLimit;
                    })
            } else if (window.location.href.includes("profile") && currentTab == "posts") {
                offset = 0;
                fetchUserPosts(offset)
                    .then(() => {
                        offset += ProfileLimit; // increment offset
                    })
            } else if (window.location.pathname === "/") { // Don't work in post page
                offset = 0;
                LoadPosts(offset, selectedTags.join(",")).then(() => {
                    offset += HomeLimit;
                });
            }
        }
        localStorage.setItem("postCreated", "true");
    } catch (err) {
        console.log(err);
        PopError("Something went wrong")
    }
}

// Implement front-end limits on title/content size.
function CheckPostSize(contentLength, titleLength, imageSize, elem) {
    if (contentLength == 0 || titleLength == 0) {
        DisplayError("postErrorMsg", elem, "Title and content are required");
        return true
    }
    if (contentLength < 6) {
        DisplayError("postErrorMsg", elem, "Post content is too short");
        return true;
    }
    if (titleLength < 4) {
        DisplayError("postErrorMsg", elem, "Post title is too short");
        return true;
    }
    if (contentLength > 8000) {
        DisplayError("postErrorMsg", elem, "Post content is too large");
        return true;
    }
    if (titleLength > 500) {
        DisplayError("postErrorMsg", elem, "Post title is too large");
        return true;
    }

    // Image size check (not above 20 MB)
    const maxImageSize = 20 * 1024 * 1024;
    if (imageSize && imageSize > maxImageSize) {
        DisplayError("postErrorMsg", elem, "Image is too large (max 20MB)");
        return true;
    }

    return false;
}
