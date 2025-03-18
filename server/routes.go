package server

import (
	"net/http"
	"time"
)

// Application routes.
func Routes() http.Handler {
	mux := http.NewServeMux()

	// Rate limiters, prevent spam and DoS attacks.
	// Allow 1 request per 20(x) microsecond
	rl := NewRateLimiter(20 * time.Microsecond)

	mux.HandleFunc("/", HomeHandler)
	mux.HandleFunc("/css/", FilesHandler)
	mux.HandleFunc("/js/", FilesHandler)
	mux.HandleFunc("/img/", FilesHandler)
	mux.HandleFunc("/uploads/", FilesHandler)
	mux.HandleFunc("/api/check-session", CheckSession)
	mux.HandleFunc("/api/get-posts", GetPostsHandler)
	mux.HandleFunc("/api/get-categories", GetCategoriesHandler)
	mux.HandleFunc("/api/get-reactions", GetReactions)
	mux.HandleFunc("/api/get-singlePost", SinglePostHandler)
	mux.HandleFunc("/api/get-comments", GetComments)
	mux.HandleFunc("/api/comments-count", GetCommentsCount)
	mux.HandleFunc("/api/user-info", ProfileInfoHandler)
	mux.HandleFunc("/api/user-posts", UserPosts)
	mux.HandleFunc("/api/user-liked-posts", LikedPosts)
	mux.HandleFunc("/api/user-commented-posts", UserCommentedPosts)
	mux.HandleFunc("/api/user-post-comments", GetUserPostComments)
	mux.Handle("/api/update-profile-pic", rl.Middleware(http.HandlerFunc(UpdateProfilePic)))
	mux.HandleFunc("/api/get-notifications", GetNotifications)
	mux.Handle("/api/delete-notification", rl.Middleware(http.HandlerFunc(DeleteNotification)))
	mux.Handle("/api/delete-all-notifications", rl.Middleware(http.HandlerFunc(DeleteAllNotifications)))
	mux.HandleFunc("/ws/notifications", NotificationSocket)
	mux.HandleFunc("/ws/online-users", OnlineUsersWS)
	mux.HandleFunc("/api/get-messages", GetMessages)
	mux.Handle("/api/send-message", rl.Middleware(http.HandlerFunc(SendMessage)))
	mux.HandleFunc("/ws/messages", MessageWebSocket)
	mux.Handle("/api/update-online-users", rl.Middleware(http.HandlerFunc(UpdateOnlineUsers)))
	mux.HandleFunc("/api/check-user", CheckUserHandler)
	mux.HandleFunc("/api/get-profile-info", GetProfileInfo)
	mux.HandleFunc("/api/get-user-posts", GetUserPosts)

	// Rate Limiting (Auth & Content Creation)
	mux.Handle("/api/login", rl.Middleware(http.HandlerFunc(LoginHandler)))
	mux.Handle("/api/signup", rl.Middleware(http.HandlerFunc(SignUpHandler)))
	mux.Handle("/api/logout", rl.Middleware(http.HandlerFunc(LogoutHandler)))
	mux.Handle("/api/create-post", rl.Middleware(http.HandlerFunc(CreatePostHandler)))
	mux.Handle("/api/add-categories", rl.Middleware(http.HandlerFunc(AddCategoriesHandler)))
	mux.Handle("/api/add-reaction", rl.Middleware(http.HandlerFunc(AddReaction)))
	mux.Handle("/api/add-comment", rl.Middleware(http.HandlerFunc(AddComment)))

	// Routes for social login.
	mux.HandleFunc("/auth/google", GoogleLoginHandler)
	mux.HandleFunc("/auth/github", GithubLoginHandler)
	mux.HandleFunc("/auth/callback", SocialCallbackHandler)
	mux.HandleFunc("/api/social-signup", SocialSignupHandler)
	mux.HandleFunc("/api/social-check", CheckOAuth)

	return secureHeaders(mux)
}

// Home (spa) handler.
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JsonError(w, http.StatusText(http.StatusMethodNotAllowed), 405, nil)
		return
	}
	ParseAndExecute(w, "", "static/templates/home.html")
}
