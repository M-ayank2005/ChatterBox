package groups

import (
	"context"
	"time"

	"whatsapp-clone/internal/db"
	"whatsapp-clone/internal/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateGroupRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Members     []string `json:"members"`
}

type AddMembersRequest struct {
	Members []string `json:"members"`
}

func CreateGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req CreateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Group name is required"})
	}

	// Convert member IDs
	members := []primitive.ObjectID{objID} // Creator is always a member
	for _, memberID := range req.Members {
		mID, err := primitive.ObjectIDFromHex(memberID)
		if err == nil && mID != objID {
			members = append(members, mID)
		}
	}

	group := models.Group{
		Name:        req.Name,
		Description: req.Description,
		CreatorID:   objID,
		Admins:      []primitive.ObjectID{objID},
		Members:     members,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	collection := db.MongoClient.Database("whatsapp").Collection("groups")
	result, err := collection.InsertOne(context.Background(), group)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create group"})
	}

	group.ID = result.InsertedID.(primitive.ObjectID)
	return c.Status(201).JSON(group)
}

func GetGroups(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	collection := db.MongoClient.Database("whatsapp").Collection("groups")
	cursor, err := collection.Find(context.Background(), bson.M{
		"members": objID,
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch groups"})
	}
	defer cursor.Close(context.Background())

	var groups []models.Group
	if err := cursor.All(context.Background(), &groups); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to decode groups"})
	}

	if groups == nil {
		groups = []models.Group{}
	}

	return c.JSON(groups)
}

func GetGroup(c *fiber.Ctx) error {
	groupID := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	collection := db.MongoClient.Database("whatsapp").Collection("groups")
	var group models.Group
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&group)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Group not found"})
	}

	// Get member details
	userCollection := db.MongoClient.Database("whatsapp").Collection("users")
	cursor, err := userCollection.Find(context.Background(), bson.M{
		"_id": bson.M{"$in": group.Members},
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch members"})
	}
	defer cursor.Close(context.Background())

	var members []models.User
	if err := cursor.All(context.Background(), &members); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to decode members"})
	}

	return c.JSON(fiber.Map{
		"group":   group,
		"members": members,
	})
}

func AddMembers(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	groupID := c.Params("id")

	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req AddMembersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Check if user is admin
	collection := db.MongoClient.Database("whatsapp").Collection("groups")
	var group models.Group
	err = collection.FindOne(context.Background(), bson.M{
		"_id":    groupObjID,
		"admins": userObjID,
	}).Decode(&group)
	if err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Only admins can add members"})
	}

	// Convert and add new members
	var newMembers []primitive.ObjectID
	for _, memberID := range req.Members {
		mID, err := primitive.ObjectIDFromHex(memberID)
		if err == nil {
			newMembers = append(newMembers, mID)
		}
	}

	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": groupObjID},
		bson.M{
			"$addToSet": bson.M{"members": bson.M{"$each": newMembers}},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to add members"})
	}

	return c.JSON(fiber.Map{"message": "Members added successfully"})
}

func LeaveGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	groupID := c.Params("id")

	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	collection := db.MongoClient.Database("whatsapp").Collection("groups")
	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": groupObjID},
		bson.M{
			"$pull": bson.M{"members": userObjID, "admins": userObjID},
			"$set":  bson.M{"updated_at": time.Now()},
		},
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to leave group"})
	}

	return c.JSON(fiber.Map{"message": "Left group successfully"})
}

func UpdateGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	groupID := c.Params("id")

	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	collection := db.MongoClient.Database("whatsapp").Collection("groups")
	
	// Check if user is admin
	var group models.Group
	err = collection.FindOne(context.Background(), bson.M{
		"_id":    groupObjID,
		"admins": userObjID,
	}).Decode(&group)
	if err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Only admins can update group"})
	}

	update := bson.M{"updated_at": time.Now()}
	if req.Name != "" {
		update["name"] = req.Name
	}
	if req.Description != "" {
		update["description"] = req.Description
	}

	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": groupObjID},
		bson.M{"$set": update},
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update group"})
	}

	return c.JSON(fiber.Map{"message": "Group updated successfully"})
}
