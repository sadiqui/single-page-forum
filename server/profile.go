package server

import (
	"database/sql"
	"encoding/json"
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

// Handles fetching paginated posts for a specific user
func GetUserPosts(w http.ResponseWriter, r *http.Request) {
	// Ensure it's a GET request
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	// Extract username from query params
	username := r.URL.Query().Get("username")
	if username == "" {
		JsonError(w, "Missing username parameter", http.StatusBadRequest, nil)
		return
	}

	// Extract offset from query params (default to 0 if not provided)
	offsetStr := r.URL.Query().Get("offset")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	// Query to get posts for the given user (join users to get username & profile_pic)
	query := `
		SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at, u.username, u.profile_pic
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE u.username = ?
		ORDER BY p.created_at DESC
		LIMIT 10 OFFSET ?
	`

	rows, err := DB.Query(query, username, offset)
	if err != nil {
		JsonError(w, "Database error", http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	// Use the ScanRows helper function
	posts, err := ScanRows(rows)
	if err != nil {
		JsonError(w, "Error scanning database", http.StatusInternalServerError, err)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}
