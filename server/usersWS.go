package server

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

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

	// For each connected user, build a custom list of online users that excludes their own entry.
	for recipientID, conn := range onlineUsers {
		var users []map[string]string
		for userID := range onlineUsers {
			if userID == recipientID {
				// Skip the recipient's own information.
				continue
			}
			username, profilePic := GetUsername(userID), GetUserProfilePic(userID)
			users = append(users, map[string]string{
				"username":    username,
				"profile_pic": profilePic,
			})
		}

		data, _ := json.Marshal(users)
		conn.WriteMessage(websocket.TextMessage, data)
	}
}
