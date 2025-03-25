package server

import "time"

type User struct {
	ID         int    `json:"id"`
	Email      string `json:"email"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Age        int    `json:"age"`
	Gender     string `json:"gender"`
	ProfilePic string `json:"profile_pic"`
}

type Post struct {
	ID         int        `json:"id"`
	UserID     int        `json:"user_id"`
	Title      string     `json:"title"`
	Content    string     `json:"content"`
	CreatedAt  time.Time  `json:"created_at"`
	Username   string     `json:"username"`
	ProfilePic string     `json:"profile_pic"`
	Image      string     `json:"image"`
	Categories []Category `json:"categories,omitempty"`
}

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Comment struct {
	ID         int       `json:"id"`
	Username   string    `json:"username"`
	Content    string    `json:"content"`
	ProfilePic string    `json:"profile_pic"`
	CreatedAt  time.Time `json:"created_at"`
}

type Notification struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	ActorID         int       `json:"actor_id"`
	ActorUsername   string    `json:"actor_username"`
	ActorProfilePic string    `json:"actor_profilePic"`
	PostID          *int      `json:"post_id,omitempty"`
	Type            string    `json:"type"`
	Message         string    `json:"message"`
	CreatedAt       time.Time `json:"created_at"`
	ReadStatus      bool      `json:"read_status"`
}

// Delete contradictory reaction notif
// When like/dislike reaction change
type NotificationDeletion struct {
	UserID  int      `json:"user_id"`
	ActorID int      `json:"actor_id"`
	PostID  *int     `json:"post_id"`
	Types   []string `json:"types"`
	Action  string   `json:"action"` // "delete"
}

type Message struct {
	ID        int       `json:"id"`
	Sender    string    `json:"sender"`
	Receiver  string    `json:"receiver"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}
