package server

import (
	"fmt"
	"net/http"
	"sync"
	"time"
)

// CooldownManager tracks user request rates
type CooldownManager struct {
	requestCounts map[string]*userRequestData
	mutex         sync.Mutex
}

type userRequestData struct {
	count       int
	lastRequest time.Time
	inCooldown  bool
	cooldownEnd time.Time
}

// NewCooldownManager creates a new cooldown manager
func NewCooldownManager() *CooldownManager {
	return &CooldownManager{
		requestCounts: make(map[string]*userRequestData),
	}
}

// Global cooldown manager instance
var cooldownMgr = NewCooldownManager()

// CooldownMiddleware is a middleware that checks for request rate limiting
func CooldownMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip cooldown check for API endpoints and the cooldown page itself
		if r.URL.Path == "/cooldown" || r.URL.Path == "/api/cooldown-status" {
			next.ServeHTTP(w, r)
			return
		}

		// Get user identifier
		userID := r.RemoteAddr // Use a more robust method in production

		cooldownMgr.mutex.Lock()
		userData, exists := cooldownMgr.requestCounts[userID]

		now := time.Now()

		if !exists {
			// First request from this user
			cooldownMgr.requestCounts[userID] = &userRequestData{
				count:       1,
				lastRequest: now,
				inCooldown:  false,
			}
			cooldownMgr.mutex.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		// Check if user is in cooldown
		if userData.inCooldown {
			if now.After(userData.cooldownEnd) {
				// Cooldown period has ended
				userData.inCooldown = false
				userData.count = 1
				userData.lastRequest = now
				cooldownMgr.mutex.Unlock()
				next.ServeHTTP(w, r)
			} else {
				// Still in cooldown - redirect to cooldown page
				cooldownMgr.mutex.Unlock()
				http.Redirect(w, r, "/cooldown", http.StatusSeeOther)
			}
			return
		}

		// Check if this request is within the 7-second window
		if now.Sub(userData.lastRequest) < 7*time.Second {
			userData.count++
			if userData.count > 7 {
				// Too many requests, enter cooldown
				userData.inCooldown = true
				userData.cooldownEnd = now.Add(7 * time.Second)
				cooldownMgr.mutex.Unlock()
				http.Redirect(w, r, "/cooldown", http.StatusSeeOther)
				return
			}
		} else {
			// Reset count for new time window
			userData.count = 1
		}

		userData.lastRequest = now
		cooldownMgr.mutex.Unlock()
		next.ServeHTTP(w, r)
	})
}

// Cooldown handler
func CooldownStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrorHandler(w, 405, http.StatusText(http.StatusMethodNotAllowed), "Only GET method is allowed!", nil)
		return
	}

	// Get user identifier
	userID := r.RemoteAddr // Use a more robust method in production

	cooldownMgr.mutex.Lock()
	userData, exists := cooldownMgr.requestCounts[userID]
	now := time.Now()

	// Check if user is in cooldown
	if exists && userData.inCooldown {
		timeRemaining := userData.cooldownEnd.Sub(now).Seconds()
		if timeRemaining <= 0 {
			// Cooldown has ended
			userData.inCooldown = false
			userData.count = 0
			cooldownMgr.mutex.Unlock()

			// Return OK status
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))
		} else {
			// Still in cooldown
			cooldownMgr.mutex.Unlock()

			// Return cooldown info
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests) // 429
			w.Write([]byte(fmt.Sprintf(`{"status":"cooldown","message":"Too many requests","timeRemaining":%.1f}`, timeRemaining)))
		}
	} else {
		// Not in cooldown
		cooldownMgr.mutex.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}
}
