package profile

import (
	"context"
	"time"

	"whatsapp-clone/internal/db"
	"whatsapp-clone/internal/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UpdateProfileRequest struct {
	Username string `json:"username"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
}

func GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	collection := db.MongoClient.Database("whatsapp").Collection("users")
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(user)
}

func UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	update := bson.M{"updated_at": time.Now()}
	if req.Username != "" {
		update["username"] = req.Username
	}
	if req.Bio != "" {
		update["bio"] = req.Bio
	}
	if req.Avatar != "" {
		update["avatar"] = req.Avatar
	}

	collection := db.MongoClient.Database("whatsapp").Collection("users")
	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": update},
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	// Fetch updated user
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch updated profile"})
	}

	return c.JSON(user)
}

func GetUserStatus(c *fiber.Ctx) error {
	targetUserID := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(targetUserID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	collection := db.MongoClient.Database("whatsapp").Collection("users")
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(models.UserStatus{
		UserID:   targetUserID,
		IsOnline: user.IsOnline,
		LastSeen: user.LastSeen,
	})
}

func SetOnlineStatus(userID string, isOnline bool) error {
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	collection := db.MongoClient.Database("whatsapp").Collection("users")
	update := bson.M{
		"is_online":  isOnline,
		"updated_at": time.Now(),
	}
	if !isOnline {
		update["last_seen"] = time.Now()
	}

	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": update},
	)
	return err
}
