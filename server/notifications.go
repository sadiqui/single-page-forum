package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

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

	rows, err := DB.Query(`
		SELECT n.id, n.user_id, n.actor_id, a.username AS actor_username,
		       n.post_id, n.type, n.created_at
		FROM notifications n
		JOIN users a ON n.actor_id = a.id
		WHERE n.user_id = ?
		ORDER BY n.created_at DESC
	`, user.ID)
	if err != nil {
		JsonError(w, "Failed to query notifications", http.StatusInternalServerError, err)
		return
	}
	defer rows.Close()

	var notifs []Notification
	for rows.Next() {
		var (
			n       Notification
			postID  sql.NullInt64
			actorUN string
		)
		err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.ActorID,
			&actorUN,
			&postID,
			&n.Type,
			&n.CreatedAt,
		)
		if err != nil {
			JsonError(w, "Failed to scan notification", http.StatusInternalServerError, err)
			return
		}

		// Convert postID if valid
		if postID.Valid {
			val := int(postID.Int64)
			n.PostID = &val
		}

		n.ActorUsername = actorUN

		// Build a user-friendly message
		n.Message = buildNotification(n.ActorUsername, n.Type)

		notifs = append(notifs, n)
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
	// Add other cases if needed
	default:
		return fmt.Sprintf("%s ", actorUsername)
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
