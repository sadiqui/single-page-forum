package server

import (
	"crypto/tls"
	"crypto/x509"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"
)

var (
	Port       string
	Router     http.Handler
	httpServer *http.Server
)

// Starts the HTTP server with TLS
func Server(handler http.Handler) {
	listener, err := net.Listen("tcp", ":"+Port)
	if err != nil {
		log.Fatalf("Error starting server: %v", err)
	}

	Port = strconv.Itoa(listener.Addr().(*net.TCPAddr).Port)

	// If running on Fly.io, start an HTTP-only server
	if os.Getenv("FLY_APP_NAME") != "" {
		startHTTPOnly(handler, listener)
		return
	}

	cert, err := tls.LoadX509KeyPair("tls/server.crt", "tls/server.key")
	if err != nil {
		log.Fatalf("Failed to load key pair: %v", err)
	}

	caCertPool := x509.NewCertPool()
	caCert, err := os.ReadFile("tls/ca.crt")
	if err != nil {
		log.Println("Warning: CA certificate not found, continuing without extra CA trust.")
	} else {
		caCertPool.AppendCertsFromPEM(caCert)
	}

	tlsConfig := &tls.Config{
		CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP256},
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		},
		Certificates: []tls.Certificate{cert}, // Define server's certificate
		MinVersion:   tls.VersionTLS12,        // Minimal accepted TLS version
		RootCAs:      caCertPool,              // Add CA as trusted authority
		ClientAuth:   tls.NoClientCert,        // Mutual TLS is not needed
	}

	httpServer = &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,  // Headers must arrive within 5s
		ReadTimeout:       5 * time.Second,  // Prevent slow-client attacks
		WriteTimeout:      5 * time.Second,  // Protect from server hanging
		IdleTimeout:       15 * time.Second, // Redure unauthorised access
		TLSConfig:         tlsConfig,        // Bind the TLS configuration
	}

	log.Printf("Starting server on https://127.0.0.1:%s", Port)

	if err := httpServer.Serve(tls.NewListener(listener, tlsConfig)); err != nil && err != http.ErrServerClosed {
		log.Printf("Server error: %v", err)
	}
}

// Starts an HTTP server without TLS (for Fly.io)
func startHTTPOnly(handler http.Handler, listener net.Listener) {
	httpServer = &http.Server{
		Handler:      handler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
		IdleTimeout:  15 * time.Second,
	}

	log.Printf("Running on Fly.io. Starting HTTP server on http://0.0.0.0:%s", Port)
	if err := httpServer.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Printf("Server error: %v", err)
	}
}
