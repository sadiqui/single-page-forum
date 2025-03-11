package server

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"

	"golang.org/x/crypto/bcrypt"
)

const (
	maxEmailSize    = 200
	maxUsernameSize = 50
	maxNameSize     = 50
	maxPasswordSize = 100
	maxPicSize      = 5 << 20 // 5 MB for profile picture
)

// Signing up a new user.
func SignUpHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JsonError(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed, nil)
		return
	}

	// Parse the incoming multipart form
	mr, err := r.MultipartReader()
	if err != nil {
		JsonError(w, "Invalid form submission", http.StatusBadRequest, err)
		return
	}

	var (
		email, username, password, firstName, lastName, gender string
		ageStr                                                 string
		profilePic                                             []byte
	)

	// Read parts in a loop
	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break // no more parts
		}
		if err != nil {
			JsonError(w, "Error reading form data", http.StatusInternalServerError, err)
			return
		}

		switch part.FormName() {
		case "email":
			b, err := LimitRead(part, maxEmailSize)
			if err != nil {
				JsonError(w, "Email is too long", http.StatusBadRequest, err)
				return
			}
			email = string(b)

		case "username":
			b, err := LimitRead(part, maxUsernameSize)
			if err != nil {
				JsonError(w, "Username is too long", http.StatusBadRequest, err)
				return
			}
			username = string(b)

		case "password":
			b, err := LimitRead(part, maxPasswordSize)
			if err != nil {
				JsonError(w, "Password is too long", http.StatusBadRequest, err)
				return
			}
			password = string(b)

		case "first_name":
			b, err := LimitRead(part, maxNameSize)
			if err != nil {
				JsonError(w, "First name is too long", http.StatusBadRequest, err)
				return
			}
			firstName = string(b)

		case "last_name":
			b, err := LimitRead(part, maxNameSize)
			if err != nil {
				JsonError(w, "Last name is too long", http.StatusBadRequest, err)
				return
			}
			lastName = string(b)

		case "age":
			// Age is numeric, but read as a string first, then parse
			b, err := LimitRead(part, 4) // Age won't exceed 4 digits realistically
			if err != nil {
				JsonError(w, "Age is too large or invalid", http.StatusBadRequest, err)
				return
			}
			ageStr = string(b)

		case "gender":
			b, err := LimitRead(part, 10) // "male"/"female"
			if err != nil {
				JsonError(w, "Gender input is too long", http.StatusBadRequest, err)
				return
			}
			gender = string(b)

		case "profile_pic":
			// Optional field
			contentType := part.Header.Get("Content-Type")
			if !(len(contentType) > 6 && contentType[:6] == "image/") {
				JsonError(w, "Invalid image content type", http.StatusBadRequest, fmt.Errorf("content type: %s", contentType))
				return
			}
			// Read the image data (limit size)
			profilePic, err = LimitRead(part, maxPicSize)
			if err != nil {
				JsonError(w, "Profile picture too large", http.StatusBadRequest, err)
				return
			}
		}
	}

	// Convert age from string -> int
	var age int
	if ageStr != "" {
		age, err = strconv.Atoi(ageStr)
		if err != nil {
			JsonError(w, "Invalid age, must be a number", http.StatusBadRequest, err)
			return
		}
	}

	// Populate the user struct
	user := User{
		Email:     email,
		Username:  username,
		Password:  password,
		FirstName: firstName,
		LastName:  lastName,
		Age:       age,
		Gender:    gender,
	}

	// Validate user fields (same checks as your JSON-based approach)
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

	var profilePicPath string
	if len(profilePic) > 0 {
		// For safety, also check if it's an SVG
		if isSVG(profilePic) {
			JsonError(w, "svg images aren't supported", http.StatusUnauthorized, nil)
			return
		}
		// Save the profile picture to disk
		profilePicPath, err = SaveImg(profilePic)
		if err != nil {
			JsonError(w, "Failed to save profile image", http.StatusInternalServerError, err)
			return
		}
	}
	user.ProfilePic = profilePicPath

	// Insert user into DB.
	// If you have a column for profile_pic in your users table, adapt the query accordingly.
	insertUser := `
	INSERT INTO users 
	(email, username, password, first_name, last_name, age, gender, profile_pic)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	_, err = DB.Exec(insertUser,
		user.Email,
		user.Username,
		hashedPassword,
		user.FirstName,
		user.LastName,
		user.Age,
		user.Gender,
		user.ProfilePic,
	)
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
