package server

import (
	"bytes"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
)

// Parse the html files and execute them after checking for errors.
func ParseAndExecute(w http.ResponseWriter, data any, filename string) {
	tmpl, err := template.ParseFiles(filename)
	if err != nil {
		if strings.HasSuffix(filename, "error.html") {
			ServeCloudError(w, data.(ErrorData), err)
			return
		}
		ErrorHandler(w, http.StatusInternalServerError, "Something seems wrong, try again later!", "Internal Server Error!", err)
		return
	}

	// Write to a temporary buffer instead of writing directly to w.
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		if strings.HasSuffix(filename, "error.html") {
			ServeCloudError(w, data.(ErrorData), err)
			return
		}
		ErrorHandler(w, http.StatusInternalServerError, "Something seems wrong, try again later!", "Internal Server Error!", err)
		return
	}
	// If successful, write the buffer content to the ResponseWriter.
	buf.WriteTo(w)
}

func Cooldown(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrorHandler(w, 405, http.StatusText(http.StatusMethodNotAllowed), "Only GET method is allowed!", nil)
		return
	}
	ParseAndExecute(w, "", "static/templates/cooldown.html")
}

// Secure Headers Middleware.
func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "script-src 'self';")                    // For XSS attacks
		w.Header().Set("X-Frame-Options", "DENY")                                          // For clickjacking
		w.Header().Set("X-Content-Type-Options", "nosniff")                                // For MIME sniffing
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains") // Always use HTTPS
		next.ServeHTTP(w, r)
	})
}

// Listens for termination signals and ensures the DB is closed before exiting.
func Shutdown() {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	<-stop
	log.Println("shutting down server...")
	if err := DB.Close(); err != nil {
		log.Println("Error closing DB:", err)
	}
	os.Exit(0)
}
