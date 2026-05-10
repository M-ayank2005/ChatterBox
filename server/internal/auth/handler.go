package auth

import (
	"context"
	"os"
	"time"

	"whatsapp-clone/internal/db"
	"whatsapp-clone/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func Signup(c *fiber.Ctx) error {
	var input struct {
		Username string `json:"username"`
		Phone    string `json:"phone"`
		Bio      string `json:"bio"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Normalize phone number - remove spaces, dashes, and ensure consistent format
	normalizedPhone := normalizePhoneNumber(input.Phone)

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not hash password"})
	}

	user := models.User{
		Username: input.Username,
		Phone:    normalizedPhone,
		Bio:      input.Bio,
		Password: string(hash),
		Avatar:   "https://api.dicebear.com/7.x/initials/svg?seed=" + input.Username,
	}

	collection := db.MongoClient.Database("whatsapp").Collection("users")
	
    // Check if user exists - properly handle errors
    count, err := collection.CountDocuments(context.TODO(), bson.M{"phone": normalizedPhone})
    if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error checking phone number"})
    }
    if count > 0 {
        return c.Status(400).JSON(fiber.Map{"error": "Phone number already in use"})
    }

	res, err := collection.InsertOne(context.TODO(), user)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create user"})
	}
    
    // Get the inserted ID
    user.ID = res.InsertedID.(primitive.ObjectID)

	return c.JSON(user)
}

// normalizePhoneNumber removes common formatting characters for consistent comparison
func normalizePhoneNumber(phone string) string {
	// Remove spaces, dashes, parentheses, and plus sign
	normalized := ""
	for _, char := range phone {
		if char >= '0' && char <= '9' {
			normalized += string(char)
		}
	}
	return normalized
}

func Login(c *fiber.Ctx) error {
	var input struct {
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Normalize phone number for consistent comparison
	normalizedPhone := normalizePhoneNumber(input.Phone)

	collection := db.MongoClient.Database("whatsapp").Collection("users")
	var user models.User
	err := collection.FindOne(context.TODO(), bson.M{"phone": normalizedPhone}).Decode(&user)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "User not found"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid password"})
	}

	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["user_id"] = user.ID.Hex()
	claims["exp"] = time.Now().Add(time.Hour * 72).Unix()

	t, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate token"})
	}

	return c.JSON(fiber.Map{"token": t, "user": user})
}

func GetUsers(c *fiber.Ctx) error {
    collection := db.MongoClient.Database("whatsapp").Collection("users")
    cursor, err := collection.Find(context.TODO(), bson.M{})
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Could not fetch users"})
    }
    
    var users []models.User
    if err = cursor.All(context.TODO(), &users); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Error parsing users"})
    }
    
    return c.JSON(users)
}

func SearchUserByPhone(c *fiber.Ctx) error {
    phone := c.Query("phone")
    if phone == "" {
        return c.Status(400).JSON(fiber.Map{"error": "Phone number required"})
    }

    // Normalize phone number for consistent comparison
    normalizedPhone := normalizePhoneNumber(phone)

    collection := db.MongoClient.Database("whatsapp").Collection("users")
    var user models.User
    err := collection.FindOne(context.TODO(), bson.M{"phone": normalizedPhone}).Decode(&user)
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "User not found"})
    }

    return c.JSON(user)
}

