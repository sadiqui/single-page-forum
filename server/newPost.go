package server

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"regexp"

	"github.com/gofrs/uuid"
)

const (
	// To avoid conflicts (post payload allowed in front and denied in back)
	// backend max should be bigger or equal than frontend max.
	maxTitleSize      = 700
	maxContentSize    = 10000
	maxCategoriesSize = 1000
	maxImageSize      = 20 * 1024 * 1024 // 20MB (20 << 20)
)

// Handle adding a new post to DB.
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JsonError(w, "Method not allowed", http.StatusMethodNotAllowed, nil)
		return
	}

	safeTitle, safeContent, categories, imageB, quit := LimitRequestBody(w, r)
	if quit {
		return
	}

	user, err := GetUser(r)
	if err != nil {
		JsonError(w, "Login to add a post", http.StatusUnauthorized, err)
		return
	}

	var imagePath string
	// Upload image to the server.
	if len(imageB) > 0 {
		if isSVG(imageB) {
			JsonError(w, "svg images aren't supported", http.StatusUnauthorized, nil)
			return
		}
		imagePath, err = SaveImg(imageB)
		if err != nil {
			JsonError(w, "Failed to create post", http.StatusInternalServerError, err)
			return
		}
	}

	// Insert post
	res, err := DB.Exec(`
	INSERT INTO posts (user_id, title, content, image)
	VALUES (?, ?, ?, ?)`,
		user.ID, safeTitle, safeContent, imagePath,
	)
	if err != nil {
		JsonError(w, "Failed to create post", http.StatusInternalServerError, err)
		return
	}
	postID, err := res.LastInsertId()
	if err != nil {
		JsonError(w, "Failed to retrieve post ID", http.StatusInternalServerError, err)
		return
	}

	// Insert categories in join table.
	if quit := InsertCategories(w, postID, categories); quit {
		return
	}
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Post created successfully"))
}

// Check form values and Limit their readers one by one.
func LimitRequestBody(w http.ResponseWriter, r *http.Request) (string, string, []string, []byte, bool) {
	mr, err := r.MultipartReader()
	if err != nil {
		JsonError(w, "Invalid form values", http.StatusBadRequest, err)
		return "", "", nil, nil, true
	}

	var titleB, contentB, catJson, imageB []byte
	var categories []string

	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			JsonError(w, "Error reading form part", http.StatusInternalServerError, err)
			return "", "", nil, nil, true
		}

		switch part.FormName() {
		case "title":
			titleB, err = LimitRead(part, maxTitleSize)
			if err != nil {
				JsonError(w, "Title is too big", http.StatusBadRequest, err)
				return "", "", nil, nil, true
			}
		case "content":
			contentB, err = LimitRead(part, maxContentSize)
			if err != nil {
				JsonError(w, fmt.Sprintf("Content exceeded max length of %d characters", maxContentSize), http.StatusBadRequest, err)
				return "", "", nil, nil, true
			}
		case "categories":
			catJson, err = LimitRead(part, maxCategoriesSize)
			if err != nil {
				JsonError(w, fmt.Sprintf("Categories exceed max length of %d", maxCategoriesSize), http.StatusBadRequest, err)
				return "", "", nil, nil, true
			}
			if len(catJson) > 0 {
				err = json.Unmarshal([]byte(catJson), &categories)
				if err != nil {
					JsonError(w, "Invalid categories format", http.StatusBadRequest, err)
					return "", "", nil, nil, true
				}
			}
		case "image":
			// Check Content-Type to ensure this is an image
			contentType := part.Header.Get("Content-Type")
			if !(len(contentType) > 6 && contentType[:6] == "image/") {
				JsonError(w, "Invalid image content type", http.StatusBadRequest, fmt.Errorf("content type: %s", contentType))
				return "", "", nil, nil, true
			}

			// Read the image data
			imageB, err = LimitRead(part, maxImageSize)
			if err != nil {
				JsonError(w, "Image exceeded max size of 20mb.", http.StatusBadRequest, err)
				return "", "", nil, nil, true
			}
		}
	}
	title, content := string(titleB), string(contentB)

	if title == "" || content == "" {
		JsonError(w, "Title and content are required", http.StatusBadRequest, nil)
		return "", "", nil, nil, true
	}
	if len(title) < 4 {
		JsonError(w, "Title is too short", http.StatusBadRequest, nil)
		return "", "", nil, nil, true
	}
	if len(content) < 6 {
		JsonError(w, "Post content is too short", http.StatusBadRequest, nil)
		return "", "", nil, nil, true
	}

	// remove consecutive more than three consecutive new lines to just two.
	re := regexp.MustCompile(`(\r\n|\r|\n){3,}`)
	content = re.ReplaceAllString(content, "\n\n")

	return html.EscapeString(title), html.EscapeString(content), categories, imageB, false
}

// LimitRead reads the entire stream from `part` and limits the size to maxSize bytes.
// If the data exceeds `maxSize`, it returns an error. Otherwise, it returns the full data.
func LimitRead(part io.Reader, maxSize int) ([]byte, error) {
	var buf bytes.Buffer

	// LimitReader will stop reading after maxSize + 1 bytes.
	limitedReader := io.LimitReader(part, int64(maxSize)+1)

	n, err := io.Copy(&buf, limitedReader)
	if err != nil {
		return nil, fmt.Errorf("failed to read data: %w", err)
	}

	// If we read more than maxSize bytes, the data is too large.
	if n > int64(maxSize) {
		return nil, fmt.Errorf("data exceeds max allowed size of %d bytes", maxSize)
	}

	// Return the full data (up to maxSize).
	return buf.Bytes(), nil
}

// Check if the categories in the post payload are present in categories Table.
// And Insert them into post_categories join table
func InsertCategories(w http.ResponseWriter, postID int64, categories []string) bool {
	if len(categories) > 3 {
		JsonError(w, "You can select only up to 3 categories", http.StatusBadRequest, nil)
		return true
	}

	for _, category := range categories {
		var categoryID int64

		// Check if category exists, and retrieve its ID
		err := DB.QueryRow(`
            SELECT id 
            FROM categories 
            WHERE name = ?
        `, category).Scan(&categoryID)

		// If the category does not exist
		if err == sql.ErrNoRows {
			JsonError(w, fmt.Sprintf("Category %s not found.", category), http.StatusBadRequest, err)
			return true
		} else if err != nil {
			JsonError(w, "Failed to find category", http.StatusInternalServerError, err)
			return true
		}

		// Insert into post_categories join table
		_, err = DB.Exec(`
            INSERT INTO post_categories (post_id, category_id) 
            VALUES (?, ?) 
        `, postID, categoryID)
		if err != nil {
			JsonError(w, "failed to link category.", http.StatusInternalServerError, err)
			return true
		}
	}
	return false
}

// Save image and return uuid path to insert in DB.
func SaveImg(imageB []byte) (string, error) {
	imguuid, err := uuid.NewV4()
	if err != nil {
		return "", err
	}
	imgSavingPath := "./static/uploads/" + imguuid.String() + ".jpg"

	err = os.WriteFile(imgSavingPath, imageB, 0o644)
	if err != nil {
		return "", err
	}

	imgServingPath := imguuid.String() + ".jpg"

	return imgServingPath, nil
}

// Check if an image is svg type.
func isSVG(imageB []byte) bool {
	// Remove unnecessary leading characters
	trimmed := bytes.TrimLeft(imageB, " \t\n\r\xef\xbb\xbf")
	if len(trimmed) < 4 {
		return false // Can't be an SVG
	}
	// Case-insensitive comparison
	lower := bytes.ToLower(trimmed)
	return bytes.HasPrefix(lower, []byte("<?xml")) ||
		bytes.Contains(lower, []byte("<svg"))
}
