package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Represents the incoming request to send a message.
type SendMessageRequest struct {
	Receiver string `json:"receiver"`
	Content  string `json:"content"`
}

// Returns all messages exchanged between the logged-in user and a selected user.
func GetMessages(w http.ResponseWriter, r *http.Request) {
	// Get current logged-in user (implement GetUser accordingly)
	currentUser, err := GetUser(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get selected user's username from query parameter
	selectedUsername := r.URL.Query().Get("user")
	if selectedUsername == "" {
		http.Error(w, "Missing user parameter", http.StatusBadRequest)
		return
	}

	// Get the selected user object
	selectedUser, err := GetUserByUsername(selectedUsername)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Query messages exchanged between currentUser and selectedUser,
	// joining the users table to get the sender and receiver usernames.
	query := `
        SELECT m.id, u1.username AS sender, u2.username AS receiver, m.content, m.created_at
        FROM messages m
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?)
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
    `
	rows, err := DB.Query(query, currentUser.ID, selectedUser.ID, selectedUser.ID, currentUser.ID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		err := rows.Scan(&msg.ID, &msg.Sender, &msg.Receiver, &msg.Content, &msg.CreatedAt)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		messages = append(messages, msg)
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

// Handles inserting a new message into the database.
func SendMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUser, err := GetUser(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SendMessageRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil || req.Receiver == "" || req.Content == "" {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	receiver, err := GetUserByUsername(req.Receiver)
	if err != nil {
		http.Error(w, "Receiver not found", http.StatusNotFound)
		return
	}

	query := "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)"
	result, err := DB.Exec(query, currentUser.ID, receiver.ID, req.Content)
	if err != nil {
		http.Error(w, "Failed to send message", http.StatusInternalServerError)
		return
	}

	messageID, _ := result.LastInsertId()

	// Populate newMessage with the sender's and receiver's usernames.
	newMessage := Message{
		ID:        int(messageID),
		Sender:    currentUser.Username, // assuming currentUser has a Username field
		Receiver:  receiver.Username,
		Content:   req.Content,
		CreatedAt: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newMessage)
}
