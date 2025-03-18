package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

const messagesLimit = 10

// Returns all messages exchanged between the logged-in user and a selected user.
func GetMessages(w http.ResponseWriter, r *http.Request) {
	currentUser, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	selectedUsername := r.URL.Query().Get("user")
	if selectedUsername == "" {
		JsonError(w, "Missing user parameter", http.StatusBadRequest, nil)
		return
	}

	// Parse offset/limit from query
	offsetStr := r.URL.Query().Get("offset")

	var offset int
	if offsetStr == "" {
		offset = 0
	} else {
		fmt.Sscanf(offsetStr, "%d", &offset) // handle error if needed
	}

	selectedUser, err := GetUserByUsername(selectedUsername)
	if err != nil {
		JsonError(w, "User not found", http.StatusNotFound, err)
		return
	}

	// We want the *newest* messages first, so we ORDER BY created_at DESC
	// Then we LIMIT & OFFSET. Because we want them in ascending order
	// in the UI, we'll reverse them after scanning.
	query := `
        SELECT m.id,
               u1.username AS sender,
               u2.username AS receiver,
               m.content,
               m.created_at
        FROM messages m
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?)
            OR (m.sender_id = ? AND m.receiver_id = ?))
        ORDER BY m.id DESC
        LIMIT ? OFFSET ?
    `
	rows, err := DB.Query(query,
		currentUser.ID, selectedUser.ID,
		selectedUser.ID, currentUser.ID,
		messagesLimit, offset)
	if err != nil {
		JsonError(w, "Database error", http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var reverseOrder []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.Sender, &msg.Receiver, &msg.Content, &msg.CreatedAt); err != nil {
			JsonError(w, "Database error", http.StatusInternalServerError, err)
			return
		}
		reverseOrder = append(reverseOrder, msg)
	}

	// Reverse them so the earliest is first, the newest is last
	// i.e. ascending order by created_at
	var messages []Message
	for i := len(reverseOrder) - 1; i >= 0; i-- {
		messages = append(messages, reverseOrder[i])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// Fetches a user by their username
func GetUserByUsername(username string) (*User, error) {
	var user User

	err := DB.QueryRow(`
		SELECT id, username, email, profile_pic
		FROM users
		WHERE username = ?
	`, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.ProfilePic,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	return &user, nil
}
