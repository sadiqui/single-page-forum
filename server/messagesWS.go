package server

import (
	"encoding/json"
	"html"
	"net/http"
	"regexp"
	"strings"
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
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil) // Upgrade HTTP to WebSocket
	if err != nil {
		JsonError(w, "WebSocket upgrade failed", http.StatusInternalServerError, err)
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
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	var msgPayload struct {
		Receiver string `json:"receiver"`
		Content  string `json:"content"`
	}

	// Limit the size of the request body to 8 KB
	r.Body = http.MaxBytesReader(w, r.Body, 8000)
	if err := json.NewDecoder(r.Body).Decode(&msgPayload); err != nil {
		JsonError(w, "Invalid request", http.StatusBadRequest, err)
		return
	}

	msgPayload.Content = processMsg(msgPayload.Content)
	if msgPayload.Content == "" {
		JsonError(w, "can't send empty message", http.StatusBadRequest, err)
		return
	}

	receiver, err := GetUserByUsername(msgPayload.Receiver)
	if err != nil {
		JsonError(w, "User not found", http.StatusNotFound, err)
		return
	}

	// Store message in DB
	_, err = DB.Exec(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
		user.ID, receiver.ID, msgPayload.Content)
	if err != nil {
		JsonError(w, "Failed to save message", http.StatusInternalServerError, err)
		return
	}

	// Notify receiver if online
	BroadcastMessage(user.ID, receiver.ID, msgPayload.Content)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"msg":     "Message sent successfully",
		"content": msgPayload.Content,
	})
}

// Validates and sanitizes messages
func processMsg(content string) string {
	// Trim spaces and escape HTML
	content = strings.TrimSpace(content)
	content = html.EscapeString(content)

	// Remove more than three consecutive new lines to just two
	re := regexp.MustCompile(`(\r\n|\r|\n){3,}`)
	content = re.ReplaceAllString(content, "\n\n")

	return content
}
