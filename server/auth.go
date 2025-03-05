package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"

	"github.com/gofrs/uuid"
)

var (
	GithubClientSecret string
	GoogleClientSecret string
	GithubClientID     string
	GoogleClientID     string
)

// Functions to set up OAuth callback URLs.
func getGithubReURL() string {
	if os.Getenv("FLY_APP_NAME") != "" {
		return "https://web-based-forum.fly.dev/auth/callback?provider=github"
	}
	return fmt.Sprintf("https://localhost:%s/auth/callback?provider=github", Port)
}

func getGoogleReURL() string {
	if os.Getenv("FLY_APP_NAME") != "" {
		return "https://web-based-forum.fly.dev/auth/callback?provider=google"
	}
	return fmt.Sprintf("https://localhost:%s/auth/callback?provider=google", Port)
}

type GitHub struct {
	Login string `json:"login"`
}

type Google struct {
	Email string `json:"email"`
}

// User click google button so he is redirected to "/auth/google"
// Below we have the handler that will redirect to providerr's authorization page.
func GoogleLoginHandler(w http.ResponseWriter, r *http.Request) {
	authURL := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=openid%%20email",
		GoogleClientID,
		getGoogleReURL(),
	)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// Initiates the GitHub OAuth flow.
func GithubLoginHandler(w http.ResponseWriter, r *http.Request) {
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=user",
		GithubClientID,
		getGithubReURL(),
	)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// Goolge/Github Call back function used to get code which is exchanged for an access token and then used to fetch the user's email.
func SocialCallbackHandler(w http.ResponseWriter, r *http.Request) {
	provider := r.URL.Query().Get("provider")
	code := r.URL.Query().Get("code")
	if code == "" || provider == "" {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	var email string
	switch provider {
	case "google":
		// Assuming GoogleReURL is the redirect URI configured with Google.
		data := url.Values{}
		data.Set("client_id", GoogleClientID)
		data.Set("client_secret", GoogleClientSecret)
		data.Set("redirect_uri", getGoogleReURL())
		data.Set("grant_type", "authorization_code")
		data.Set("code", code)

		resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
		if err != nil || resp.StatusCode != http.StatusOK {
			JsonError(w, "Unable to exchange code for token", http.StatusNotFound, err)
			return
		}
		defer resp.Body.Close()
		var tokenResp struct {
			AccessToken string `json:"access_token"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
			JsonError(w, "Failed to decode token response", http.StatusInternalServerError, err)
			return
		}
		req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
		req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)
		userResp, err := http.DefaultClient.Do(req)
		if err != nil || userResp.StatusCode != http.StatusOK {
			JsonError(w, "Failed to fetch Google user info", http.StatusInternalServerError, err)
			return
		}
		defer userResp.Body.Close()
		var googleUser Google
		if err := json.NewDecoder(userResp.Body).Decode(&googleUser); err != nil {
			JsonError(w, "Failed to decode Google user info", http.StatusInternalServerError, err)
			return
		}
		email = googleUser.Email

	case "github":
		data := url.Values{}
		data.Set("client_id", GithubClientID)
		data.Set("client_secret", GithubClientSecret)
		data.Set("code", code)
		resp, err := http.PostForm("https://github.com/login/oauth/access_token", data)
		if err != nil || resp.StatusCode != http.StatusOK {
			JsonError(w, "Unable to exchange code for token", http.StatusNotFound, err)
			return
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			JsonError(w, "Failed to read token response", http.StatusInternalServerError, err)
			return
		}
		tokenResp, err := url.ParseQuery(string(body))
		if err != nil {
			JsonError(w, "Failed to parse token response", http.StatusInternalServerError, err)
			return
		}
		accessToken := tokenResp.Get("access_token")
		req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		userResp, err := http.DefaultClient.Do(req)
		if err != nil || userResp.StatusCode != http.StatusOK {
			JsonError(w, "Failed to fetch GitHub user info", http.StatusInternalServerError, err)
			return
		}
		defer userResp.Body.Close()
		var githubUser GitHub
		if err := json.NewDecoder(userResp.Body).Decode(&githubUser); err != nil {
			JsonError(w, "Failed to decode GitHub user info", http.StatusInternalServerError, err)
			return
		}
		// Since GitHub may not provide an email by default, fabricate one.
		email = githubUser.Login + "@github.com"

	default:
		JsonError(w, "Unknown provider", http.StatusBadRequest, nil)
		return
	}

	// Call authentication handling logic.
	HandleAuth(email, w, r)
}

// We got the email so now we need to handle re-landing to our forum website.
func HandleAuth(email string, w http.ResponseWriter, r *http.Request) {
	// Try to look up the user by email.
	var user User
	err := DB.QueryRow(`SELECT id, email, username, password FROM users WHERE email = ?`, email).
		Scan(&user.ID, &user.Email, &user.Username, &user.Password)
	if err == nil {
		// User exists - create a session and log them in.
		if err = CreateSession(w, &user); err != nil {
			JsonError(w, "Error creating session", http.StatusInternalServerError, err)
			return
		}
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// No user found - store the social email in a cookie.
	http.SetCookie(w, &http.Cookie{
		Name:     "social_email",
		Value:    email,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: false, // so js can rmd with document.cookie
	})
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// Handle social signup
func SocialSignupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}
	// Retrieve the social email from the cookie.
	cookie, err := r.Cookie("social_email")
	if err != nil {
		JsonError(w, "Signup token expired, try again", http.StatusUnauthorized, err)
		return
	}
	email := cookie.Value

	// Parse the JSON payload (expects { "username": "chosenUsername" }).
	var reqData struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
		JsonError(w, "Invalid request payload", http.StatusBadRequest, err)
		return
	}

	if ValidateUsername(w, reqData.Username) {
		return
	}

	// Create a placeholder password, that doesn't fit the bcrypt structure.
	placeholder, err := uuid.NewV4()
	if err != nil {
		JsonError(w, "Error creating password uuid", http.StatusInternalServerError, err)
		return
	}

	// Insert the new user record.
	res, err := DB.Exec("INSERT INTO users (email, username, password) VALUES (?, ?, ?)",
		email, reqData.Username, placeholder.String())
	if err != nil {
		JsonError(w, "Error creating user", http.StatusInternalServerError, err)
		return
	}
	userID, err := res.LastInsertId()
	if err != nil {
		JsonError(w, "Error retrieving user ID", http.StatusInternalServerError, err)
		return
	}
	newUser := User{
		ID:       int(userID),
		Email:    email,
		Username: reqData.Username,
	}
	// Create a session for the newly signed-up user.
	if err = CreateSession(w, &newUser); err != nil {
		JsonError(w, "Error creating session", http.StatusInternalServerError, err)
		return
	}
	// Clear the temporary social_email cookie.
	http.SetCookie(w, &http.Cookie{
		Name:     "social_email",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Signup complete", "username": reqData.Username})
}

// Validate choosen username.
func ValidateUsername(w http.ResponseWriter, username string) bool {
	if len(username) < 3 {
		JsonError(w, "Username is too short", http.StatusBadRequest, nil)
		return true
	}
	if len(username) > 16 {
		JsonError(w, "Username is too long", http.StatusBadRequest, nil)
		return true
	}
	usernameRegex := `^[a-zA-Z0-9_.-]+$`
	if match, _ := regexp.MatchString(usernameRegex, username); !match {
		JsonError(w, "username can only contain letters, digits, underscores, dots, and hyphens", http.StatusBadRequest, nil)
		return true
	}
	// Check if the chosen username already exists.
	var exists int
	err := DB.QueryRow("SELECT 1 FROM users WHERE username = ?", username).Scan(&exists)
	if err == nil {
		JsonError(w, "Username already exists", http.StatusBadRequest, nil)
		return true
	}
	return false
}

// Check if env variables for social OAuth buttons are available.
func CheckOAuth(w http.ResponseWriter, r *http.Request) {
	type OauthResponse struct {
		HasGoogle bool `json:"hasGoogle"`
		HasGithub bool `json:"hasGithub"`
	}

	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	githubClientID := os.Getenv("GITHUB_CLIENT_ID")
	githubClientSecret := os.Getenv("GITHUB_CLIENT_SECRET")

	// Build a response indicating which env vars are set
	response := OauthResponse{
		HasGoogle: googleClientID != "" && googleClientSecret != "",
		HasGithub: githubClientID != "" && githubClientSecret != "",
	}

	// Send the JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
