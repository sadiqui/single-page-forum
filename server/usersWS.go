package server

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type OnlineUserInfo struct {
	Username   string    `json:"username"`
	ProfilePic string    `json:"profile_pic"`
	LastMsg    time.Time `json:"last_msg"`
}

// Request struct for updating online users
type UpdateUsersRequest struct {
	Users []OnlineUserInfo `json:"users"`
}

// Track online users - modified to support multiple connections per user
var (
	onlineUsers = make(map[int]map[*websocket.Conn]bool) // userID -> map of WebSockets
	mu          sync.Mutex                               // Mutex to prevent race conditions
)

// Handle WebSocket connections for online users
func OnlineUsersWS(w http.ResponseWriter, r *http.Request) {
	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		JsonError(w, "WebSocket upgrade failed", http.StatusInternalServerError, err)
		return
	}

	// Extract user ID from session
	user, err := GetUser(r)
	if err != nil {
		conn.Close()
		return
	}

	// Add user to online users map
	mu.Lock()
	// Initialize the map if this is the first connection for this user
	if _, exists := onlineUsers[user.ID]; !exists {
		onlineUsers[user.ID] = make(map[*websocket.Conn]bool)
	}
	onlineUsers[user.ID][conn] = true
	mu.Unlock()

	// Broadcast updated list to all clients
	BroadcastOnlineUsers()

	// Listen for disconnect
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			// Remove this specific connection
			mu.Lock()
			delete(onlineUsers[user.ID], conn)
			// If this was the user's last connection, clean up the user entry
			if len(onlineUsers[user.ID]) == 0 {
				delete(onlineUsers, user.ID)
				// Only broadcast when the user's last connection is closed
				mu.Unlock()
				BroadcastOnlineUsers()
			} else {
				mu.Unlock()
			}
			conn.Close()
			break
		}
	}
}

// Send updated online users list to all connected clients
func BroadcastOnlineUsers() {
	mu.Lock()
	defer mu.Unlock()

	// For each connected user, build a list of online users (excluding themselves)
	for recipientID, recipientConns := range onlineUsers {
		var users []OnlineUserInfo

		// Get the list of online users
		for userID := range onlineUsers {
			if userID == recipientID {
				continue
			}
			username := GetUsername(userID)
			profilePic := GetUserProfilePic(userID)
			lastMsg, err := GetLastConversationTime(recipientID, userID)
			if err != nil {
				lastMsg = time.Time{} // zero if error
			}
			users = append(users, OnlineUserInfo{
				Username:   username,
				ProfilePic: profilePic,
				LastMsg:    lastMsg,
			})
		}

		data, err := json.Marshal(users)
		if err != nil {
			continue
		}

		// Send to all connections of this user
		for conn := range recipientConns {
			conn.WriteMessage(websocket.TextMessage, data)
		}
	}
}

// Get the last message time between two users
func GetLastConversationTime(userA, userB int) (time.Time, error) {
	var timeStr sql.NullString
	err := DB.QueryRow(`
		SELECT MAX(created_at) FROM messages 
		WHERE (sender_id = ? AND receiver_id = ?)
		   OR (sender_id = ? AND receiver_id = ?)
	`, userA, userB, userB, userA).Scan(&timeStr)
	if err != nil {
		return time.Time{}, err
	}
	if timeStr.Valid {
		// Parse the returned string to time.Time using the appropriate layout.
		// Adjust the layout if your datetime string is in a different format.
		t, err := time.Parse("2006-01-02 15:04:05", timeStr.String)
		if err != nil {
			return time.Time{}, err
		}
		return t, nil
	}
	return time.Time{}, nil
}

// Update Online Users Endpoint
func UpdateOnlineUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}
	var req UpdateUsersRequest

	// Decode JSON request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JsonError(w, "Invalid request payload.", http.StatusBadRequest, err)
		return
	}

	// Get the currently logged-in user
	currentUser, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized.", http.StatusUnauthorized, err)
		return
	}

	// Update each user's LastMsg field
	for i, user := range req.Users {
		userID := GetUserID(user.Username) // Fetch user ID based on username

		// Get updated data
		username := GetUsername(userID)
		profilePic := GetUserProfilePic(userID)
		lastMsg, err := GetLastConversationTime(currentUser.ID, userID)
		if err != nil {
			lastMsg = time.Time{} // Set to zero time if error occurs
		}

		// Assign updated info back
		req.Users[i] = OnlineUserInfo{
			Username:   username,
			ProfilePic: profilePic,
			LastMsg:    lastMsg,
		}
	}

	// Respond with updated user list
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(req.Users)
}

// Helper function to get user ID from username
func GetUserID(username string) int {
	var userID int
	err := DB.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID)
	if err != nil {
		return 0 // Return 0 if user not found
	}
	return userID
}
