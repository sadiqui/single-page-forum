package server

import (
	"bufio"
	"log"
	"os"
	"strings"
)

// Set variables environment from .env file.
func SetEnv() {
	file, err := os.Open(".env")
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			log.Printf("Skipping malformed line: %s", line)
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		if key == "" || value == "" {
			log.Printf("Skipping line with empty key: %s", line)
			continue
		}
		err = os.Setenv(key, value)
		if err != nil {
			log.Printf("Error setting environment variable: %v", err)
			return
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("Error setting environment variable: %v", err)
		return
	}
}
