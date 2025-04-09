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
	connections = make(map[int]map[*websocket.Conn]bool) // userID -> map of WebSockets
	connMutex   sync.Mutex                               // Prevent race conditions
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
	// Initialize the map if this is the first connection for this user
	if _, exists := connections[user.ID]; !exists {
		connections[user.ID] = make(map[*websocket.Conn]bool)
	}
	connections[user.ID][conn] = true
	connMutex.Unlock()

	defer func() {
		connMutex.Lock()
		// Remove this specific connection
		delete(connections[user.ID], conn)
		// If this was the user's last connection, clean up the user entry
		if len(connections[user.ID]) == 0 {
			delete(connections, user.ID)
		}
		connMutex.Unlock()
		conn.Close()
	}()

	// Keep WebSocket open and (only) listen for typing events
	// (Regular chat messages are sent to /api/send-message)
	for {
		// From sendTypingStatus() in typing.js
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var event map[string]interface{} // Values could be of any type
		json.Unmarshal(message, &event)

		if event["type"] == "typing" {
			// Safety check for type assertions
			receiverName, okStr := event["receiver"].(string)
			isTypingVal, okBool := event["isTyping"].(bool)
			if okStr && okBool {
				receiver, _ := GetUserByUsername(receiverName)
				BroadcastTyping(user.ID, receiver.ID, isTypingVal)
			}
		}
	}
}

// Broadcast message to the receiver if they're online
func BroadcastMessage(senderID int, receiverID int, content string) {
	connMutex.Lock()
	receiverConns, online := connections[receiverID]
	connMutex.Unlock()

	if online {
		msg := map[string]string{
			"sender":  GetUsername(senderID),
			"content": content,
		}

		msgJSON, _ := json.Marshal(msg)

		// Broadcast to all connections of the receiver
		for conn := range receiverConns {
			conn.WriteMessage(websocket.TextMessage, msgJSON) // Write to connectMessagesWS()
		}
	}
}

// BroadcastTyping sends a typing notification to the receiver
func BroadcastTyping(senderID int, receiverID int, isTyping bool) {
	connMutex.Lock()
	receiverConns, online := connections[receiverID]
	senderUsername := GetUsername(senderID)
	connMutex.Unlock()

	if online {
		typingEvent := TypingEvent{
			Sender:   senderUsername,
			IsTyping: isTyping,
		}

		msgJSON, _ := json.Marshal(typingEvent)

		// Broadcast to all connections of the receiver
		for conn := range receiverConns {
			conn.WriteMessage(websocket.TextMessage, msgJSON) // Write to connectMessagesWS()
		}
	}
}

// Uses WebSocket for real-time messaging
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
