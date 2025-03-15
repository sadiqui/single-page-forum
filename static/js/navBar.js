/****************************************
*      Switch to logged in navBar       *
*****************************************/
function ShowLoggedInNav(username, profilePicture) {
    setTimeout(togglePosition, 0);
    window.addEventListener("resize", togglePosition);

    const navElement = document.getElementById('navBar');
    if (!navElement) return;
    navElement.innerHTML = Nav;

    const navbar = document.querySelector(".navbar");
    if (!navbar) return;
    navbar.innerHTML = `
    <a href="/" class="logo-link">
        <img src="/img/logo.svg" alt="Forum Logo" class="logo-img" />
    </a>
    <div class="avatar-menu">
        <img 
            src="../uploads/${profilePicture}" 
            alt="Profile Avatar" 
            class="avatar-img" 
        />
        <ul class="dropdown-menu hidden">
            <li class="dropdown-header">${username}</li>
            <li id="createPost"><a href="#">Create Post</a></li>
            <li id="logoutBtn"><a href="#">Logout<i class="fas fa-sign-out-alt" style="margin-left: 8px;"></i></a></li>
        </ul>
    </div>
    `;

    // Floating add button + back to top button
    document.getElementById("fabAddPost")?.classList.remove("hidden");

    DropDownMenu();
}

/****************************************
*      Switch to logged out navBar      *
*****************************************/
function ShowLoggedOutNav() {
    document.getElementById('navBar').innerHTML = Nav
    // Hide the floating "+" button
    document.getElementById("fabAddPost")?.classList.add("hidden")
}

/*******************
* Drop down menu
********************/
function DropDownMenu() {
    const avatarMenu = document.querySelector(".avatar-menu");
    const dropDownMenu = document.querySelector(".dropdown-menu");

    // Check if it's a touch device
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) {
        // Non-touch devices: add using hover
        avatarMenu.addEventListener("mouseenter", () => {
            dropDownMenu.classList.remove("hidden");
        });
        avatarMenu.addEventListener("mouseleave", () => {
            dropDownMenu.classList.add("hidden");
        });
    }

    // Use click for both (touch and mouse)
    avatarMenu.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent the event from bubbling to document
        dropDownMenu.classList.toggle("hidden");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!avatarMenu.contains(e.target)) {
            dropDownMenu.classList.add("hidden");
        }
    });
}

/**********************
* Scroll to the top
***********************/
// Event delegation solve the issue of
// having the script loaded before the button
document.body.addEventListener("click", (event) => {
    if (event.target.closest(".back-to-top")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});
window.addEventListener("scroll", function () {
    if (window.scrollY > 2200) {
        document.querySelector(".back-to-top")?.classList.remove("hidden");
    } else {
        document.querySelector(".back-to-top")?.classList.add("hidden");
    }
});
