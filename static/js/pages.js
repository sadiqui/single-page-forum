const dynamicContent = document.getElementById("content");

async function homeRenderer() {
    try {
        const res = await fetch(`/`);
        if (!res.ok) {
            throw new Error("Failed to fetch home page");
        }
        history.pushState({}, "", `/`)
        const home = document.createElement("div");
        home.innerHTML = `
        <div class="home-div"></div>
        <section id="tagFilterSection">
            <h3>Filter by tags</h3>
            <div id="tagFilterContainer">
                <div id="selectedTags" class="selected-tags"></div>
                <input type="text" id="tagFilterInput" class="tag-filter-input"
                    placeholder="Type a tag..." />
                <div id="tagSuggestions" class="tag-suggestions hidden"></div>
            </div>
        </section>
        <main class="main-content">
            <section id="postsContainer"></section>
        </main>
        `;
        dynamicContent.innerHTML = "";
        dynamicContent.appendChild(home);
    } catch (err) {
        console.error(err);
        DisplayError("errMsg", dynamicContent, "Error loading user info.");
    }
}

// async function profileRenderer(username) {
//     try {
//         const res = await fetch(`/profile?user=${username}`);
//         if (!res.ok) {
//             throw new Error("Failed to fetch user profile");
//         }
//         history.pushState({}, "", `/profile?user=${username}`)
//         const profile = document.createElement("div");
//         profile.innerHTML = `
//         <div class="content-section">
//             <div class="profile-card">
//                 <div class="profile-div"></div>
//                 <div class="profile-image">
//                     <img src="../img/avatar.webp"
//                         alt="Profile Picture" />
//                 </div>
//                 <div class="username">${username}</div>
//                 <div class="buttons-container">
//                     <button class="action-btn" data-type="liked">
//                         <i class="fas fa-heart"></i> Liked
//                     </button>
//                     <button class="action-btn" data-type="posts">
//                         <i class="fas fa-file-alt"></i> Posts
//                     </button>
//                     <button class="action-btn" data-type="info">
//                         <i class="fa-solid fa-circle-info"></i> &nbsp;Info&nbsp;
//                     </button>
//                 </div>
//                 <div id="dynamicContent"></div>
//             </div>
//         </div>
//         `;
//         dynamicContent.innerHTML = "";
//         dynamicContent.appendChild(profile);
//     } catch (err) {
//         console.error(err);
//         DisplayError("errMsg", dynamicContent, "Error loading user info.");
//     }
// }
