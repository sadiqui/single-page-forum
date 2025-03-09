package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

// Signing up a new user.
func SignUpHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JsonError(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed, nil)
		return
	}

	// Limit the size of the request body to 30 KB
	r.Body = http.MaxBytesReader(w, r.Body, 30000)

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		JsonError(w, "Invalid request payload or size exceeded", http.StatusBadRequest, err)
		return
	}

	if err := ValidateSignUp(user); err != nil {
		JsonError(w, err.Error(), http.StatusNotAcceptable, err)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		JsonError(w, "unexpected error, try again later", http.StatusInternalServerError, err)
		return
	}

	insertUser := `INSERT INTO users (email, username, password, first_name, last_name, age, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err = DB.Exec(insertUser, user.Email, user.Username, hashedPassword, user.FirstName, user.LastName, user.Age, user.Gender)
	if err != nil {
		JsonError(w, "unexpected error, try again later", http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("User created successfully"))
}

// Validate signup payload.
func ValidateSignUp(user User) error {
	if user.Email == "" || user.Username == "" || user.Password == "" || user.FirstName == "" || user.LastName == "" || user.Age == 0 || user.Gender == "" {
		return fmt.Errorf("all fields are required")
	}

	// Validate Email
	emailRegex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,20}$`
	if match, _ := regexp.MatchString(emailRegex, user.Email); !match {
		return fmt.Errorf("invalid email format")
	}
	if len(user.Email) > 200 {
		return fmt.Errorf("email is too long")
	}

	// Validate Username
	if len(user.Username) < 3 {
		return fmt.Errorf("username is too short")
	}
	if len(user.Username) > 16 {
		return fmt.Errorf("username is too long")
	}
	usernameRegex := `^[a-zA-Z0-9_.-]+$`
	if match, _ := regexp.MatchString(usernameRegex, user.Username); !match {
		return fmt.Errorf("username can only contain letters, digits, underscores, dots, and hyphens")
	}

	// Validate First Name & Last Name
	nameRegex := `^[a-zA-Z]+$`
	if !regexp.MustCompile(nameRegex).MatchString(user.FirstName) {
		return fmt.Errorf("invalid first name")
	}
	if len(user.FirstName) < 3 {
		return fmt.Errorf("first name is too short")
	}
	if len(user.FirstName) > 25 {
		return fmt.Errorf("first name is too long")
	}
	if len(user.LastName) < 3 {
		return fmt.Errorf("last name is too short")
	}
	if len(user.LastName) > 25 {
		return fmt.Errorf("last name is too long")
	}
	if !regexp.MustCompile(nameRegex).MatchString(user.LastName) {
		return fmt.Errorf("last name must contain only letters (A-Z, a-z)")
	}

	// Validate Age
	if user.Age < 10 || user.Age > 130 {
		return fmt.Errorf("invalid age")
	}

	// Validate Gender (must be "male" or "female")
	if user.Gender != "male" && user.Gender != "female" {
		return fmt.Errorf("wrong gender")
	}

	// Validate Password
	if len(user.Password) < 6 {
		return fmt.Errorf("password is too short")
	}
	if len(user.Password) > 64 {
		return fmt.Errorf("password is too long")
	}
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(user.Password)
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(user.Password)
	hasDigit := regexp.MustCompile(`\d`).MatchString(user.Password)
	hasSpecial := regexp.MustCompile(`[\W_]`).MatchString(user.Password)
	if !hasLower || !hasUpper || !hasDigit || !hasSpecial {
		return fmt.Errorf("password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character")
	}

	// Check if email/username already exists
	exists := false
	err := DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE email = ? OR username = ?)`, user.Email, user.Username).Scan(&exists)
	if err != nil {
		return fmt.Errorf("unexpected error, try again later")
	}
	if exists {
		return fmt.Errorf("email or username already exists")
	}

	return nil
}
