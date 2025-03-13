package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
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
            n.created_at
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
		n.Message = buildNotification(n.ActorUsername, n.Type)

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
func buildNotification(actorUsername, notifType string) string {
	switch notifType {
	case "like":
		return fmt.Sprintf("%s liked your post", actorUsername)
	case "dislike":
		return fmt.Sprintf("%s disliked your post", actorUsername)
	case "comment":
		return fmt.Sprintf("%s commented on your post", actorUsername)
	default:
		return fmt.Sprintf("%s reacted on your comment", actorUsername)
	}
}

// Insert a row in "notifications" for like/dislike on a post or comment
func InsertNotification(ownerID, actorID int, postID *int, reactionType string) error {
	if reactionType == "like" || reactionType == "dislike" {
		// Delete any existing like/dislike notification for this (owner, actor, post)

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
	_, err := DB.Exec(`
		INSERT INTO notifications (user_id, actor_id, post_id, type)
		VALUES (?, ?, ?, ?)
	`,
		ownerID,      // the user receiving the notification
		actorID,      // the user who performed the action
		postID,       // if nil, it will be NULL; see note below for SQLite
		reactionType, // "like" or "dislike"
	)
	return err
}
