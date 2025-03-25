package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// UserProfile holds the profile information
type UserProfile struct {
	Username   string `json:"username"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Gender     string `json:"gender"`
	ProfilePic string `json:"profile_pic"`
	Age        int    `json:"age"`
}

// fetches user profile information
func GetProfileInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	// Ensure the requester is authenticated
	_, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Get the username from the query parameters
	username := r.URL.Query().Get("username")
	if username == "" {
		JsonError(w, "Missing username", http.StatusBadRequest, nil)
		return
	}

	var profile UserProfile
	err = DB.QueryRow(`
        SELECT username, first_name, last_name, gender, profile_pic, age
        FROM users 
        WHERE username = ?`, username).Scan(
		&profile.Username, &profile.FirstName, &profile.LastName, &profile.Gender, &profile.ProfilePic, &profile.Age,
	)

	// Handle errors properly
	if err == sql.ErrNoRows {
		JsonError(w, "User not found", http.StatusNotFound, nil)
		return
	} else if err != nil {
		JsonError(w, "Database error", http.StatusInternalServerError, err)
		return
	}

	// Return profile info as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// Check if the user is valid.
func CheckUserHandler(w http.ResponseWriter, r *http.Request) {
	// Ensure it's a GET request
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	// Get username from query params
	username := r.URL.Query().Get("username")
	if username == "" {
		JsonError(w, "Missing username parameter", http.StatusBadRequest, nil)
		return
	}

	// Check if user exists in the database
	var exists bool
	err := DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)", username).Scan(&exists)
	if err != nil && err != sql.ErrNoRows {
		JsonError(w, "Database error", http.StatusInternalServerError, err)
		return
	}

	// Send JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CheckUser{Exists: exists})
}

// Fetching paginated posts for a specific user.
// It's needed for both profile and activity tab
func GetUserPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Read "offset" query param (default 0 if missing)
	offsetParam := r.URL.Query().Get("offset")
	offset, err := strconv.Atoi(offsetParam)
	if err != nil {
		offset = 0
	}

	rows, err := DB.Query(`
      	SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at, u.username, u.profile_pic
      	FROM posts p
      	JOIN users u ON p.user_id = u.id
      	WHERE p.user_id = ?
      	ORDER BY p.id DESC
      	LIMIT ?
      	OFFSET ?
    `, user.ID, ProfileLimit, offset) // ProfileLImit = 6 (activity.go)
	if err != nil {
		JsonError(w, "Failed to get user's posts", http.StatusInternalServerError, err)
		return
	}

	defer rows.Close()

	// Use the ScanRows helper function
	posts, err := ScanRows(rows)
	if err != nil {
		JsonError(w, "Error scanning database", http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// ********** User's helper functions ********** //

// fetches a username from the database using the user ID.
func GetUsername(userID int) string {
	var username string
	err := DB.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)
	if err != nil {
		fmt.Println("Error fetching username:", err)
		return "JohnDoe" // Fallback value
	}
	return username
}

// fetches a user's profile picture from the database.
func GetUserProfilePic(userID int) string {
	var profilePic string // Allows NULL handling
	err := DB.QueryRow("SELECT profile_pic FROM users WHERE id = ?", userID).Scan(&profilePic)
	if err != nil {
		fmt.Println("Error fetching profile picture:", err)
		return "avatar.webp" // Default profile picture
	}
	return profilePic
}
