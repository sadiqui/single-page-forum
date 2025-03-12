package server

import "net/http"

// Handle index web page.
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrorHandler(w, 405, http.StatusText(http.StatusMethodNotAllowed), "Only GET method is allowed!", nil)
		return
	}
	ParseAndExecute(w, "", "static/templates/home.html")
}
