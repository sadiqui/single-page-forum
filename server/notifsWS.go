package server

import (
	"fmt"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	clients = make(map[int]map[*websocket.Conn]bool) // UserID -> Set of WebSocket connections
	mutex   = sync.Mutex{}                           // Protects concurrent access
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Check if we are running on Fly.io (deployed environment)
		if os.Getenv("FLY_APP_NAME") != "" {
			origin := "https://dwi.fly.dev"
			return r.Header.Get("Origin") == origin
		}
		// Allow all origins when running locally
		return true
	},
}

// WebSocket Handler
func NotificationSocket(w http.ResponseWriter, r *http.Request) {
	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil) // Upgrade HTTP to WebSocket
	if err != nil {
		fmt.Println("WebSocket upgrade failed:", err)
		return
	}

	// Add user connection
	mutex.Lock()
	if clients[user.ID] == nil {
		clients[user.ID] = make(map[*websocket.Conn]bool)
	}
	clients[user.ID][conn] = true
	mutex.Unlock()

	// Listen for client disconnect
	defer func() {
		mutex.Lock()
		delete(clients[user.ID], conn)
		if len(clients[user.ID]) == 0 {
			delete(clients, user.ID)
		}
		mutex.Unlock()
		conn.Close()
	}()

	// Keep connection open
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break // Client disconnected
		}
	}
}

// Sends any data structure to WebSocket connection for a user
func NotifyUserWithData(userID int, data interface{}) {
	mutex.Lock()
	defer mutex.Unlock()

	// Send to WebSocket connection for the user
	for conn := range clients[userID] {
		err := conn.WriteJSON(data)
		if err != nil {
			fmt.Println("Error sending WebSocket message:", err)
			conn.Close()
			delete(clients[userID], conn)
		}
	}
}

// Notify when adding a notification
func NotifyUser(notification Notification) {
	NotifyUserWithData(notification.UserID, notification)
}

// Notify to remove contradictory notif from UI
// Changes in like/dislike reaction for a post
func NotifyUserOfDeletion(deletion NotificationDeletion) {
	NotifyUserWithData(deletion.UserID, deletion)
}
