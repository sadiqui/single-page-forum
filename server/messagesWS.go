package server

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Stores active WebSocket connections per user
var (
	connections = make(map[int]*websocket.Conn) // userID -> WebSocket
	connMutex   sync.Mutex                      // Prevent race conditions
)

// WebSocket endpoint for real-time messaging
func MessageWebSocket(w http.ResponseWriter, r *http.Request) {
	user, err := GetUser(r) // Get logged-in user
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil) // Upgrade HTTP to WebSocket
	if err != nil {
		http.Error(w, "WebSocket Upgrade Failed", http.StatusInternalServerError)
		return
	}

	// Store the connection
	connMutex.Lock()
	connections[user.ID] = conn
	connMutex.Unlock()

	defer func() {
		connMutex.Lock()
		delete(connections, user.ID)
		connMutex.Unlock()
		conn.Close()
	}()

	// Keep WebSocket open and listen for messages (optional)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// Broadcast message to the receiver if they're online
func BroadcastMessage(senderID int, receiverID int, content string) {
	connMutex.Lock()
	receiverConn, online := connections[receiverID]
	connMutex.Unlock()

	if online {
		msg := map[string]string{
			"sender":  GetUsername(senderID),
			"content": content,
		}

		msgJSON, _ := json.Marshal(msg)
		receiverConn.WriteMessage(websocket.TextMessage, msgJSON)
	}
}

// Modify SendMessage to use WebSocket
func SendMessage(w http.ResponseWriter, r *http.Request) {
	user, err := GetUser(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var msgPayload struct {
		Receiver string `json:"receiver"`
		Content  string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&msgPayload); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	receiver, err := GetUserByUsername(msgPayload.Receiver)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Store message in DB
	_, err = DB.Exec(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
		user.ID, receiver.ID, msgPayload.Content)
	if err != nil {
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}

	// Notify receiver if online
	BroadcastMessage(user.ID, receiver.ID, msgPayload.Content)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Message sent successfully"))
}
