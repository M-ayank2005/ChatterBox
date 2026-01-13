package messages

import (
	"log"
	"time"

	"whatsapp-clone/internal/db"

	"github.com/gofiber/fiber/v2"
)

type MessageResponse struct {
	MessageID  string    `json:"message_id"`
	ChatID     string    `json:"chat_id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

// GetChatHistory fetches messages between two users
func GetChatHistory(c *fiber.Ctx) error {
	userID := c.Get("X-User-ID")
	if userID == "" {
		userID = c.Get("user_id")
	}
	if userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	otherUserID := c.Params("userId")
	if otherUserID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID required"})
	}

	if db.ScyllaSession == nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database not connected"})
	}

	// Fetch messages where this user is either sender or receiver
	// We need to query both directions since chat_id could be either user's ID
	messages := []MessageResponse{}

	// Query messages sent by current user to other user
	query1 := `SELECT message_id, chat_id, sender_id, receiver_id, content, created_at 
	           FROM messages WHERE chat_id = ? ALLOW FILTERING`
	
	iter := db.ScyllaSession.Query(query1, otherUserID).Iter()
	var msg MessageResponse
	for iter.Scan(&msg.MessageID, &msg.ChatID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.CreatedAt) {
		// Only include messages between these two users
		if (msg.SenderID == userID && msg.ReceiverID == otherUserID) ||
			(msg.SenderID == otherUserID && msg.ReceiverID == userID) {
			messages = append(messages, msg)
		}
		msg = MessageResponse{} // Reset for next iteration
	}
	if err := iter.Close(); err != nil {
		log.Printf("Error fetching messages with chat_id=%s: %v", otherUserID, err)
	}

	// Also query with current user's ID as chat_id
	iter2 := db.ScyllaSession.Query(query1, userID).Iter()
	for iter2.Scan(&msg.MessageID, &msg.ChatID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.CreatedAt) {
		// Only include messages between these two users
		if (msg.SenderID == userID && msg.ReceiverID == otherUserID) ||
			(msg.SenderID == otherUserID && msg.ReceiverID == userID) {
			messages = append(messages, msg)
		}
		msg = MessageResponse{} // Reset for next iteration
	}
	if err := iter2.Close(); err != nil {
		log.Printf("Error fetching messages with chat_id=%s: %v", userID, err)
	}

	// Sort messages by created_at (simple bubble sort for now)
	for i := 0; i < len(messages); i++ {
		for j := i + 1; j < len(messages); j++ {
			if messages[i].CreatedAt.After(messages[j].CreatedAt) {
				messages[i], messages[j] = messages[j], messages[i]
			}
		}
	}

	// Remove duplicates (in case same message appears in both queries)
	seen := make(map[string]bool)
	uniqueMessages := []MessageResponse{}
	for _, m := range messages {
		if !seen[m.MessageID] {
			seen[m.MessageID] = true
			uniqueMessages = append(uniqueMessages, m)
		}
	}

	return c.JSON(uniqueMessages)
}

// GetRecentChats returns list of users the current user has chatted with
func GetRecentChats(c *fiber.Ctx) error {
	userID := c.Get("X-User-ID")
	if userID == "" {
		userID = c.Get("user_id")
	}
	if userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if db.ScyllaSession == nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database not connected"})
	}

	// Get all messages involving this user
	chatPartners := make(map[string]time.Time) // partner ID -> last message time

	// Query all messages (this is inefficient for large datasets, but works for MVP)
	query := `SELECT sender_id, receiver_id, created_at FROM messages ALLOW FILTERING`
	iter := db.ScyllaSession.Query(query).Iter()
	
	var senderID, receiverID string
	var createdAt time.Time
	
	for iter.Scan(&senderID, &receiverID, &createdAt) {
		if senderID == userID {
			// Message sent by current user
			if existing, ok := chatPartners[receiverID]; !ok || createdAt.After(existing) {
				chatPartners[receiverID] = createdAt
			}
		} else if receiverID == userID {
			// Message received by current user
			if existing, ok := chatPartners[senderID]; !ok || createdAt.After(existing) {
				chatPartners[senderID] = createdAt
			}
		}
	}
	if err := iter.Close(); err != nil {
		log.Printf("Error fetching recent chats: %v", err)
	}

	// Convert to response format
	type ChatPartner struct {
		UserID      string    `json:"user_id"`
		LastMessage time.Time `json:"last_message"`
	}
	
	result := []ChatPartner{}
	for partnerID, lastMsg := range chatPartners {
		result = append(result, ChatPartner{
			UserID:      partnerID,
			LastMessage: lastMsg,
		})
	}

	return c.JSON(result)
}
