package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"
)

// Num of posts on each scroll load in profile.
var ProfileLimit = 6

// Handle fetching user data
func ProfileInfoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	var created time.Time
	DB.QueryRow(`SELECT created_at FROM users WHERE id = ?`, user.ID).Scan(&created)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"email":      user.Email,
		"username":   user.Username,
		"created_at": created,
	})
}

// Handler to Get the User's *Liked/disliked* Posts
func LikedPosts(w http.ResponseWriter, r *http.Request) {
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
	reaction := r.URL.Query().Get("reaction")
	if reaction != "like" && reaction != "dislike" {
		JsonError(w, "Invalid reaction type", http.StatusBadRequest, nil)
		return
	}
	offset, err := strconv.Atoi(offsetParam)
	if err != nil {
		JsonError(w, "Bad request", http.StatusBadRequest, err)
		return
	}

	rows, err := DB.Query(`
      	SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at, u.username, u.profile_pic
      	FROM post_reactions pr
      	JOIN posts p ON pr.post_id = p.id
      	JOIN users u ON p.user_id = u.id
      	WHERE pr.user_id = ? AND pr.reaction_type = ?
      	ORDER BY p.id DESC
      	LIMIT ?
      	OFFSET ?
    `, user.ID, reaction, ProfileLimit, offset)
	if err != nil {
		JsonError(w, "Failed to get posts", http.StatusInternalServerError, err)
		return
	}

	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Image, &p.CreatedAt, &p.Username, &p.ProfilePic); err != nil {
			JsonError(w, "Failed to scan liked posts", http.StatusInternalServerError, err)
			return
		}
		cats, _ := FetchPostCategories(p.ID)
		p.Categories = cats
		posts = append(posts, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// Posts that the user commented.
func UserCommentedPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Parse offset
	offsetParam := r.URL.Query().Get("offset")
	if offsetParam == "" {
		offsetParam = "0"
	}
	offset, err := strconv.Atoi(offsetParam)
	if err != nil {
		JsonError(w, "Bad request", http.StatusBadRequest, err)
		return
	}

	// Query DISTINCT posts that this user has commented on
	rows, err := DB.Query(`
        SELECT DISTINCT p.id, p.user_id, p.title, p.content, p.image, p.created_at, u.username, u.profile_pic
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE c.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT ?
        OFFSET ?
    `, user.ID, ProfileLimit, offset)
	if err != nil {
		JsonError(w, "Failed to fetch commented posts", http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	// Collect each Post
	var commentedPosts []Post
	for rows.Next() {
		var p Post
		// Make sure your columns match your Scan order
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Image, &p.CreatedAt, &p.Username, &p.ProfilePic); err != nil {
			JsonError(w, "Failed scanning post data", http.StatusInternalServerError, err)
			return
		}

		// Optionally fetch categories if you need them
		cats, _ := FetchPostCategories(p.ID)
		p.Categories = cats

		commentedPosts = append(commentedPosts, p)
	}

	// Return only the posts
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(commentedPosts)
}

// Returns only the current user's comments for a given post_id.
func GetUserPostComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	postIDStr := r.URL.Query().Get("post_id")
	if postIDStr == "" {
		JsonError(w, "Missing post_id", http.StatusBadRequest, nil)
		return
	}

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		JsonError(w, "Invalid post_id", http.StatusBadRequest, err)
		return
	}

	rows, err := DB.Query(`
        SELECT c.id, u.username, c.content, c.created_at, u.profile_pic
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.user_id = ?
        ORDER BY c.created_at ASC
    `, postID, user.ID)
	if err != nil {
		JsonError(w, "Failed to fetch user comments", http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		if err := rows.Scan(&c.ID, &c.Username, &c.Content, &c.CreatedAt, &c.ProfilePic); err != nil {
			JsonError(w, "Failed reading comments", http.StatusInternalServerError, err)
			return
		}
		comments = append(comments, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// Updates a user's profile_pic in DB and stores file on disk.
func UpdateProfilePic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	// Check if user is logged in
	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	mr, err := r.MultipartReader()
	if err != nil {
		JsonError(w, "Invalid multipart form data", http.StatusBadRequest, err)
		return
	}

	const maxSize = 1 << 20 // 1MB
	var profilePic []byte

	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break // done reading parts
		}
		if err != nil {
			JsonError(w, "Error reading form part", http.StatusInternalServerError, err)
			return
		}
		defer part.Close()
		if part.FormName() == "profile_pic" {
			data, readErr := LimitRead(part, maxSize)
			if readErr != nil {
				JsonError(w, fmt.Sprintf("Failed to read file data: %v", readErr), http.StatusBadRequest, readErr)
				return
			}
			profilePic = data
		}
	}

	if len(profilePic) == 0 {
		JsonError(w, "No file uploaded", http.StatusBadRequest, nil)
		return
	}

	if isSVG(profilePic) {
		JsonError(w, "SVG images aren't supported", http.StatusBadRequest, nil)
		return
	}

	// Retrieve old pic from DB for removal later
	var oldPic string
	err = DB.QueryRow(`SELECT profile_pic FROM users WHERE id = ?`, user.ID).Scan(&oldPic)
	if err != nil && err != sql.ErrNoRows {
		JsonError(w, "Failed to fetch old profile pic", http.StatusInternalServerError, err)
		return
	}

	// Save the new pic using your SaveImg() helper
	newPicFilename, err := SaveImg(profilePic)
	if err != nil {
		JsonError(w, "Failed to save new profile image", http.StatusInternalServerError, err)
		return
	}

	// Update user's profile_pic path in DB
	_, err = DB.Exec(`UPDATE users SET profile_pic = ? WHERE id = ?`, newPicFilename, user.ID)
	if err != nil {
		// If the DB update fails, remove newly saved file to avoid orphan images
		_ = os.Remove("./static/uploads/" + newPicFilename)
		JsonError(w, "Database update failed", http.StatusInternalServerError, err)
		return
	}

	// If there was an old pic remove it
	if oldPic != "avatar.webp" {
		_ = os.Remove("./static/uploads/" + oldPic)
	}

	response := map[string]string{"profile_pic": newPicFilename}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
