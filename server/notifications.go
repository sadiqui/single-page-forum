package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// Get user's corresponding notifications.
func GetNotifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Get offset from query parameter (default 0 if invalid or missing)
	offsetParam := r.URL.Query().Get("offset")
	offset, err := strconv.Atoi(offsetParam)
	if err != nil || offset < 0 {
		offset = 0
	}
	const limit = 15 // Fetch 15 notifications at a time

	rows, err := DB.Query(`
        SELECT 
            n.id, n.user_id, n.actor_id, 
            a.username AS actor_username, 
            a.profile_pic, 
            n.post_id, 
            n.type, 
            n.created_at,
			COALESCE(n.read_status, 0) AS read_status
        FROM notifications n
        JOIN users a ON n.actor_id = a.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
    `, user.ID, limit, offset)
	if err != nil {
		JsonError(w, "Failed to query notifications", http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var notifs []Notification

	for rows.Next() {
		var (
			n          Notification
			actorUN    string
			profilePic string
			postID     sql.NullInt64
			readStatus int
		)

		if err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.ActorID,
			&actorUN,    // a.username
			&profilePic, // a.profile_pic
			&postID,     // n.post_id
			&n.Type,
			&n.CreatedAt,
			&readStatus,
		); err != nil {
			JsonError(w, "Failed to scan notification", http.StatusInternalServerError, err)
			return
		}

		// Convert postID if valid
		if postID.Valid {
			pID := int(postID.Int64)
			n.PostID = &pID
		}

		// Assign actor fields and build message
		n.ActorUsername = actorUN
		n.ActorProfilePic = profilePic
		n.Message = buildNotification(n.Type)
		n.ReadStatus = readStatus == 1 // Convert int to bool

		notifs = append(notifs, n)
	}

	if err := rows.Err(); err != nil {
		JsonError(w, "Error iterating notifications", http.StatusInternalServerError, err)
		return
	}

	if len(notifs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}

// Helper to build the "message" string
func buildNotification(notifType string) string {
	switch notifType {
	case "like":
		return "liked your post"
	case "dislike":
		return "disliked your post"
	case "comment":
		return "commented on your post"
	default:
		return "reacted on your comment"
	}
}

// Insert a row in "notifications" for like/dislike on a post or comment
func InsertNotification(ownerID, actorID int, postID *int, reactionType string) error {
	if reactionType == "like" || reactionType == "dislike" {
		// Delete any existing like/dislike notification for this (owner, actor, post)

		// First, send a WebSocket deletion notification
		deletionNotif := NotificationDeletion{
			UserID:  ownerID,
			ActorID: actorID,
			PostID:  postID,
			Types:   []string{"like", "dislike"},
			Action:  "delete",
		}

		// Notify user about deletions before performing the DB operation
		NotifyUserOfDeletion(deletionNotif)

		// Now delete from DB
		_, err := DB.Exec(`
			DELETE FROM notifications
			WHERE user_id = ?
  			AND actor_id = ?
  			AND post_id = ?
			AND type IN ('like', 'dislike')
		`, ownerID, actorID, postID)
		if err != nil {
			return fmt.Errorf("failed to delete old reaction notification: %w", err)
		}
	}

	// Insert the new notification as before
	_, err := DB.Exec(`
		INSERT INTO notifications (user_id, actor_id, post_id, type)
		VALUES (?, ?, ?, ?)
	`,
		ownerID,      // the user receiving the notification
		actorID,      // the user who performed the action
		postID,       // if nil, it will be NULL; see note below for SQLite
		reactionType, // "like" or "dislike"
	)

	if err == nil {
		// Fetch the latest notification and send via WebSocket
		notification := Notification{
			UserID:          ownerID,
			ActorID:         actorID,
			PostID:          postID,
			Type:            reactionType,
			Message:         buildNotification(reactionType),
			ActorUsername:   GetUsername(actorID),
			ActorProfilePic: GetUserProfilePic(actorID),
			CreatedAt:       time.Now(),
		}
		NotifyUser(notification) // Send real-time WS update
	}
	return err
}

// MarkNotificationAsRead handles marking a notification as read
func MarkNotificationAsRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Parse request body
	var requestBody struct {
		NotificationID string `json:"notification_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		JsonError(w, "Invalid request body", http.StatusBadRequest, err)
		return
	}

	// Check if the notification belongs to the user
	var ownerID int
	err = DB.QueryRow(`SELECT user_id FROM notifications WHERE id = ?`, requestBody.NotificationID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			JsonError(w, "Notification not found", http.StatusNotFound, nil)
		} else {
			JsonError(w, "Failed to query notification", http.StatusInternalServerError, err)
		}
		return
	}

	// Ensure user is the owner of the notification
	if ownerID != user.ID {
		JsonError(w, "Unauthorized action", http.StatusForbidden, nil)
		return
	}

	// Update the notification to mark it as read
	_, err = DB.Exec(`UPDATE notifications SET read_status = 1 WHERE id = ?`, requestBody.NotificationID)
	if err != nil {
		JsonError(w, "Failed to mark notification as read", http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true, "message": "Notification marked as read"}`))
}

// GetUnreadNotificationCount returns the count of unread notifications for the user
func GetUnreadNotificationCount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Query the database for unread notifications count
	var count int
	err = DB.QueryRow(`
		SELECT COUNT(*) 
		FROM notifications 
		WHERE user_id = ? AND (read_status = 0 OR read_status IS NULL)
	`, user.ID).Scan(&count)
	if err != nil {
		JsonError(w, "Failed to query notification count", http.StatusInternalServerError, err)
		return
	}

	// Return the count as JSON
	response := struct {
		UnreadCount int `json:"unreadCount"`
	}{
		UnreadCount: count,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Delete a single notification after confirming the user
func DeleteNotification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Get the notification ID from query parameters
	notifIDParam := r.URL.Query().Get("id")
	notifID, err := strconv.Atoi(notifIDParam)
	if err != nil {
		JsonError(w, "Invalid notification ID", http.StatusBadRequest, err)
		return
	}

	// Check if the notification belongs to the logged-in user
	var ownerID int
	err = DB.QueryRow(`SELECT user_id FROM notifications WHERE id = ?`, notifID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			JsonError(w, "Notification not found", http.StatusNotFound, nil)
		} else {
			JsonError(w, "Failed to query notification", http.StatusInternalServerError, err)
		}
		return
	}

	// Ensure user is the owner of the notification
	if ownerID != user.ID {
		JsonError(w, "Unauthorized action", http.StatusForbidden, nil)
		return
	}

	// Delete the notification
	_, err = DB.Exec(`DELETE FROM notifications WHERE id = ?`, notifID)
	if err != nil {
		JsonError(w, "Failed to delete notification", http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Notification deleted successfully"))
}

// Delete all notifications for the logged-in user
func DeleteAllNotifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Unauthorized", http.StatusUnauthorized, err)
		return
	}

	// Delete all notifications for the logged-in user
	_, err = DB.Exec(`DELETE FROM notifications WHERE user_id = ?`, user.ID)
	if err != nil {
		JsonError(w, "Failed to delete notifications", http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("All notifications deleted successfully"))
}
