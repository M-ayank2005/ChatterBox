package chat

import (
	"context"
	"encoding/json"
	"log"
	"time"
	"whatsapp-clone/internal/db"
	"whatsapp-clone/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Hub struct {
	Clients     map[*Client]bool
	UserClients map[string]map[*Client]bool
	Broadcast   chan models.Message
	Register    chan *Client
	Unregister  chan *Client
	Typing      chan models.TypingEvent
	ReadReceipt chan models.ReadReceipt
	Presence    chan models.PresenceEvent
	CallSignal  chan models.CallSignal
}

func NewHub() *Hub {
	return &Hub{
		Broadcast:   make(chan models.Message),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		Clients:     make(map[*Client]bool),
		UserClients: make(map[string]map[*Client]bool),
		Typing:      make(chan models.TypingEvent),
		ReadReceipt: make(chan models.ReadReceipt),
		Presence:    make(chan models.PresenceEvent),
		CallSignal:  make(chan models.CallSignal),
	}
}

func (h *Hub) updateUserOnlineStatus(userID string, isOnline bool) {
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return
	}

	collection := db.MongoClient.Database("whatsapp").Collection("users")
	update := bson.M{
		"is_online":  isOnline,
		"updated_at": time.Now(),
	}
	if !isOnline {
		update["last_seen"] = time.Now()
	}

	collection.UpdateOne(context.Background(), bson.M{"_id": objID}, bson.M{"$set": update})
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			if h.UserClients[client.UserID] == nil {
				h.UserClients[client.UserID] = make(map[*Client]bool)
			}
			h.UserClients[client.UserID][client] = true
			log.Printf("✅ Client REGISTERED: userID=%s, total clients for user=%d, total UserClients keys=%d", 
				client.UserID, len(h.UserClients[client.UserID]), len(h.UserClients))

			// Set Presence
			db.RedisClient.Set(context.Background(), "user_online:"+client.UserID, "1", 0)
			h.updateUserOnlineStatus(client.UserID, true)

			// Broadcast presence to all connected users
			presenceEvent := models.PresenceEvent{
				UserID:   client.UserID,
				IsOnline: true,
				LastSeen: time.Now(),
			}
			h.broadcastPresence(presenceEvent)

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)

				if h.UserClients[client.UserID] != nil {
					delete(h.UserClients[client.UserID], client)
					if len(h.UserClients[client.UserID]) == 0 {
						delete(h.UserClients, client.UserID)
						db.RedisClient.Del(context.Background(), "user_online:"+client.UserID)
						h.updateUserOnlineStatus(client.UserID, false)

						// Broadcast offline presence
						presenceEvent := models.PresenceEvent{
							UserID:   client.UserID,
							IsOnline: false,
							LastSeen: time.Now(),
						}
						h.broadcastPresence(presenceEvent)
					}
				}
			}

		case message := <-h.Broadcast:
			// Send the message in a flat format for frontend compatibility
			log.Printf("📤 Broadcasting message from %s to %s: %s", message.SenderID, message.ReceiverID, message.Content)
			payload, err := json.Marshal(map[string]interface{}{
				"type":        "message",
				"message_id":  message.MessageID.String(),
				"chat_id":     message.ChatID,
				"sender_id":   message.SenderID,
				"receiver_id": message.ReceiverID,
				"content":     message.Content,
				"reply_to":    message.ReplyTo,
				"reply_text":  message.ReplyText,
				"status":      message.Status,
				"created_at":  message.CreatedAt,
			})
			if err != nil {
				log.Println("Error marshalling message:", err)
				continue
			}

			// Send to sender
			log.Printf("📤 Sending to sender: %s", message.SenderID)
			h.sendToUser(message.SenderID, payload)
			// Send to receiver
			if message.ReceiverID != "" {
				log.Printf("📤 Sending to receiver: %s", message.ReceiverID)
				h.sendToUser(message.ReceiverID, payload)
			}

		case typingEvent := <-h.Typing:
			payload, _ := json.Marshal(map[string]interface{}{
				"type":      "typing",
				"from_id":   typingEvent.UserID,
				"username":  typingEvent.Username,
				"is_typing": typingEvent.IsTyping,
			})
			// Send typing indicator to the other user in the chat
			h.sendToUser(typingEvent.ChatID, payload)

		case readReceipt := <-h.ReadReceipt:
			payload, _ := json.Marshal(map[string]interface{}{
				"type":        "read_receipt",
				"message_ids": []string{readReceipt.MessageID},
				"reader_id":   readReceipt.ReaderID,
			})
			// Send read receipt to the sender of the original message
			h.sendToUser(readReceipt.ChatID, payload)

		case presenceEvent := <-h.Presence:
			h.broadcastPresence(presenceEvent)

		case callSignal := <-h.CallSignal:
			// Forward call signaling to the target user
			payload, _ := json.Marshal(map[string]interface{}{
				"type":      callSignal.Type,
				"from_id":   callSignal.FromID,
				"to_id":     callSignal.ToID,
				"from_name": callSignal.FromName,
				"call_type": callSignal.CallType,
				"sdp":       callSignal.SDP,
				"candidate": callSignal.Candidate,
				"call_id":   callSignal.CallID,
			})
			h.sendToUser(callSignal.ToID, payload)
		}
	}
}

func (h *Hub) sendToUser(userID string, payload []byte) {
	if clients, ok := h.UserClients[userID]; ok {
		log.Printf("📤 Found %d client(s) for user %s", len(clients), userID)
		for client := range clients {
			select {
			case client.Send <- payload:
				log.Printf("✅ Message sent to client of user %s", userID)
			default:
				log.Printf("❌ Failed to send to client of user %s - channel full or closed", userID)
				close(client.Send)
				delete(h.Clients, client)
				delete(clients, client)
			}
		}
	} else {
		log.Printf("⚠️ User %s not found in UserClients map (user not connected)", userID)
	}
}

func (h *Hub) broadcastPresence(event models.PresenceEvent) {
	status := "offline"
	if event.IsOnline {
		status = "online"
	}
	payload, _ := json.Marshal(map[string]interface{}{
		"type":      "presence",
		"user_id":   event.UserID,
		"status":    status,
		"last_seen": event.LastSeen,
	})
	for client := range h.Clients {
		select {
		case client.Send <- payload:
		default:
			close(client.Send)
			delete(h.Clients, client)
		}
	}
}
