package contacts

import (
	"context"
	"whatsapp-clone/internal/db"
	"whatsapp-clone/internal/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AddContact - Save a contact
func AddContact(c *fiber.Ctx) error {
	var input struct {
		ContactID   string `json:"contact_id"`
		DisplayName string `json:"display_name"`
		Phone       string `json:"phone"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Get owner from context (set by auth middleware)
	ownerID := c.Locals("user_id").(string)

	contact := models.Contact{
		OwnerID:     ownerID,
		ContactID:   input.ContactID,
		DisplayName: input.DisplayName,
		Phone:       input.Phone,
	}

	collection := db.MongoClient.Database("whatsapp").Collection("contacts")
	
	// Check if contact already exists
	count, _ := collection.CountDocuments(context.TODO(), bson.M{
		"owner_id":   ownerID,
		"contact_id": input.ContactID,
	})
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Contact already exists"})
	}

	res, err := collection.InsertOne(context.TODO(), contact)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not add contact"})
	}

	contact.ID = res.InsertedID.(primitive.ObjectID)
	return c.JSON(contact)
}

// GetContacts - Get all contacts for a user
func GetContacts(c *fiber.Ctx) error {
	ownerID := c.Locals("user_id").(string)

	collection := db.MongoClient.Database("whatsapp").Collection("contacts")
	cursor, err := collection.Find(context.TODO(), bson.M{"owner_id": ownerID})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not fetch contacts"})
	}

	var contacts []models.Contact
	if err = cursor.All(context.TODO(), &contacts); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error parsing contacts"})
	}

	// Fetch user details for each contact
	usersCollection := db.MongoClient.Database("whatsapp").Collection("users")
	
	type ContactWithUser struct {
		models.Contact
		User models.User `json:"user"`
	}
	
	var contactsWithUsers []ContactWithUser
	for _, contact := range contacts {
		contactObjID, _ := primitive.ObjectIDFromHex(contact.ContactID)
		var user models.User
		err := usersCollection.FindOne(context.TODO(), bson.M{"_id": contactObjID}).Decode(&user)
		if err == nil {
			contactsWithUsers = append(contactsWithUsers, ContactWithUser{
				Contact: contact,
				User:    user,
			})
		}
	}

	return c.JSON(contactsWithUsers)
}

// DeleteContact - Remove a contact
func DeleteContact(c *fiber.Ctx) error {
	contactID := c.Params("id")
	ownerID := c.Locals("user_id").(string)

	contactObjID, err := primitive.ObjectIDFromHex(contactID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid contact ID"})
	}

	collection := db.MongoClient.Database("whatsapp").Collection("contacts")
	result, err := collection.DeleteOne(context.TODO(), bson.M{
		"_id":      contactObjID,
		"owner_id": ownerID,
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not delete contact"})
	}

	if result.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Contact not found"})
	}

	return c.JSON(fiber.Map{"message": "Contact deleted"})
}
