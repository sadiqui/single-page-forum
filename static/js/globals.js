const Nav = `
<nav class="navbar">
    <a href="/" class="logo-link">
        <img
            src="../img/logo.svg"
            alt="Forum Logo"
            class="logo-img" />
    </a>
    <button id="openAuthBtn" class="nav-btn">Log In</button>
</nav>

<!-- Floating '+' button -->
<button id="fabAddPost" class="fab hidden">+</button>
`

const LoginForm = `
<div id="authModal" class="modal hidden">
    <div class="modal-dialog">
        <!-- Close button -->
        <span id="closeModalBtn" class="close-button">&times;</span>

        <!--- LOGIN --->
        <div id="loginContainer" class="form-container">
            <h2 class="modal-title">Log In&nbsp;</h2>

            <!-- Social Login Buttons -->
            <div class="social-login">
                <button class="social-btn google-btn">
                    <img src="../img/google.svg" alt="Google Logo" class="social-icon" />
                    Continue with Google
                </button>

                <button class="social-btn github-btn">
                    <img src="../img/github.svg" alt="GitHub Logo" class="social-icon" />
                    Continue with GitHub
                </button>
            </div>


            <div class="separator">
                <span>or</span>
            </div>

            <form id="loginForm" class="auth-form">
                <label for="loginEmail">Email or username <span>*</span></label>
                <input
                    type="text"
                    id="loginEmail"
                    class="input-field"
                    placeholder="Email or username"
                    maxlength="200"
                    required />

                <label for="loginPassword">Password <span>*</span></label>
                <div class="password-container">
                    <input
                        type="password"
                        id="loginPassword"
                        class="input-field"
                        placeholder="Password"
                        maxlength="100"
                        required />
                    <button type="button" class="toggle-password" data-target="loginPassword">
                        <img src="../img/show-dark.png" alt="Show Password" width="20" height="20">
                    </button>
                </div>

                <button
                    type="submit"
                    id="loginSubmit"
                    class="submit-button disabled"
                    disabled>
                    Log In
                </button>
            </form>
            <p class="switch-text">
                Don't have an account?
                <a href="#" id="showSignUpLink" class="link">Sign Up</a>
            </p>
        </div>

        <!--- SIGN UP --->
        <div id="signUpContainer" class="form-container hidden">
            <h2 class="modal-title">Sign Up&nbsp;</h2>

            <!-- Social Login Buttons -->
            <div class="social-login">
                <button class="social-btn google-btn">
                    <img src="../img/google.svg" alt="Google Logo" class="social-icon" />
                    Continue with Google
                </button>

                <button class="social-btn github-btn">
                    <img src="../img/github.svg" alt="GitHub Logo" class="social-icon" />
                    Continue with GitHub
                </button>
            </div>

            <div class="separator">
                <span>or</span>
            </div>

            <form id="signUpForm" class="auth-form">
                <label for="signUpEmail">Email <span>*</span></label>
                <input
                    type="email"
                    id="signUpEmail"
                    class="input-field"
                    placeholder="Email"
                    maxlength="200"
                    minlength="6"
                    required />

                <label for="signUpUsername">Username <span>*</span></label>
                <input
                    type="text"
                    id="signUpUsername"
                    class="input-field"
                    placeholder="Username"
                    maxlength="100"
                    required />

                <label for="signUpPassword">Password <span>*</span></label>
                <div class="password-container">
                    <input
                        type="password"
                        id="signUpPassword"
                        class="input-field"
                        placeholder="Password"
                        maxlength="100"
                        minlength="6"
                        required />
                    <button type="button" class="toggle-password" data-target="signUpPassword">
                        <img src="../img/show-dark.png" alt="Show Password" width="20" height="20">
                    </button>
                </div>

                <button
                    type="submit"
                    id="signUpSubmit"
                    class="submit-button disabled"
                    disabled>
                    Sign Up
                </button>
            </form>
            <p class="switch-text">
                Already a member?
                <a href="#" id="showLoginLink" class="link">Log In</a>
            </p>
        </div>
    </div>
</div>
`

const socialForm = `
<!-- Social Signup Modal -->
<div id="socialSignupModal" class="modal hidden">
  <div class="modal-dialog">
    <!-- Close button -->
    <span id="closeSocialSignupModal" class="close-button">&times;</span>
    <h2>Complete Signup</h2>
    <p>Please choose a username to complete your signup.</p>
    <form id="socialSignupForm" class="auth-form">
      <label for="socialSignupUsername">Username <span>*</span></label>
      <input type="text" id="socialSignupUsername" class="input-field" placeholder="Username" required>
      <button type="submit" id="socialSignupSubmit" class="submit-button">Sign Up</button>
    </form>
    <p id="socialSignupErrorMsg" class="error-message"></p>
  </div>
</div>
`

const NewPostForm = `
<!-- New Post Modal -->
<div id="newPostModal" class="modal hidden">
    <div class="post-dialog">
        <span id="closeNewPostModal" class="close-button">&times;</span>
        <h2>Create New Post</h2>
        <form id="newPostForm" class="post-form">
            <label for="formPostTitle" class="post-label">Title</label>
            <input
                type="text"
                id="formPostTitle"
                class="post-input"
                placeholder="Enter a descriptive title..."
                maxlength="500"
                minlength="4"
                required />

            <label for="formPostContent" class="post-label">Content</label>
            <textarea
                id="formPostContent"
                class="post-textarea"
                rows="6"
                placeholder="Share your thoughts (dwi)..."
                maxlength="8000"
                required></textarea>

            <!-- TAG INPUT -->
            <label for="tagInput" class="post-label">Tags (up to 3)</label>
            <div id="tagInputContainer">
                <div id="tagList" class="tag-list"></div>
                <input
                    type="text"
                    id="tagInput"
                    class="tag-input"
                    placeholder="Search a tag..."
                    autocomplete="off" />
                <!-- Suggestions dropdown -->
                <div id="suggestionsBox" class="suggestions-box hidden"></div>
            </div>

            <!-- IMAGE INPUT -->
            <!-- Container for the file upload -->
            <div class="file-upload-container">
                <label for="formPostImage" class="file-upload">
                    <span class="upload-icon">
                        <img src="../img/upload.svg" alt="Upload Icon" />
                    </span>
                    <span class="upload-text">Upload Image (optional)</span>
                </label>

                <!-- The actual file input is hidden by CSS, but still clickable via the label -->
                <input
                    type="file"
                    id="formPostImage"
                    class="post-input hidden-file-input"
                    accept="image/*"
                />
            </div>

            <button type="submit" class="post-submit">Publish</button>
        </form>
    </div>
</div>
`

// Num of posts on each scroll load.
let HomeLimit = 10
let ProfileLimit = 6