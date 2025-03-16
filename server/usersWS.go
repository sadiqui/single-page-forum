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
	LastMsg    time.Time `json:"last_msg"` // Zero time if no conversation
}

// Track online users
var (
	onlineUsers = make(map[int]*websocket.Conn) // Stores active user connections
	mu          sync.Mutex                      // Mutex to prevent race conditions
)

// Handle WebSocket connections for online users
func OnlineUsersWS(w http.ResponseWriter, r *http.Request) {
	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "WebSocket Upgrade Failed", http.StatusInternalServerError)
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
	onlineUsers[user.ID] = conn
	mu.Unlock()

	// Broadcast updated list to all clients
	BroadcastOnlineUsers()

	// Listen for disconnect
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			// Remove user on disconnect
			mu.Lock()
			delete(onlineUsers, user.ID)
			mu.Unlock()
			conn.Close()
			BroadcastOnlineUsers()
			break
		}
	}
}

// Send updated online users list to all connected clients
func BroadcastOnlineUsers() {
	mu.Lock()
	defer mu.Unlock()

	// For each connected user, build a sorted list of online users (excluding themselves)
	for recipientID, conn := range onlineUsers {
		var users []OnlineUserInfo
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
		conn.WriteMessage(websocket.TextMessage, data)
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
