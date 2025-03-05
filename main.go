package main

import (
	"forum/server"
)

func main() {
	// Initialize server components
	if !server.Initialise() {
		return // For Docker (-print-port flag)
	}
	// Initialize router
	server.Router = server.Routes()
	// Handle shutdown
	go server.Shutdown()
	// Start the server
	server.Server(server.Router)
}
