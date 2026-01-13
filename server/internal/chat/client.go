package chat

import (
	"encoding/json"
	"log"
	"time"

	"whatsapp-clone/internal/db"
	"whatsapp-clone/internal/models"

	"github.com/gocql/gocql"
	"github.com/gofiber/contrib/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 10240
)

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID string
}

type IncomingMessage struct {
	Type       string `json:"type"` // message, typing, read_receipt, presence, call_offer, call_answer, ice_candidate, call_end, call_reject
	ChatID     string `json:"chat_id"`
	Content    string `json:"content"`
	ReceiverID string `json:"receiver_id"`
	ReplyTo    string `json:"reply_to,omitempty"`
	ReplyText  string `json:"reply_text,omitempty"`
	IsTyping   bool   `json:"is_typing,omitempty"`
	MessageID  string `json:"message_id,omitempty"`
	UserID     string `json:"user_id,omitempty"`
	Status     string `json:"status,omitempty"`
	// Call signaling fields
	ToID      string `json:"to_id,omitempty"`
	FromName  string `json:"from_name,omitempty"`
	CallType  string `json:"call_type,omitempty"`
	SDP       string `json:"sdp,omitempty"`
	Candidate string `json:"candidate,omitempty"`
	CallID    string `json:"call_id,omitempty"`
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		log.Printf("📨 Received message from user %s: %s", c.UserID, string(message))

		var incoming IncomingMessage
		if err := json.Unmarshal(message, &incoming); err != nil {
			log.Printf("Invalid message format: %v", err)
			continue
		}

		// Handle different message types
		switch incoming.Type {
		case "typing":
			// Get username for typing indicator
			username := c.getUserName()
			c.Hub.Typing <- models.TypingEvent{
				UserID:   c.UserID,
				ChatID:   incoming.ReceiverID,
				Username: username,
				IsTyping: incoming.IsTyping,
			}

		case "read_receipt":
			c.Hub.ReadReceipt <- models.ReadReceipt{
				MessageID: incoming.MessageID,
				ChatID:    incoming.ReceiverID,
				ReaderID:  c.UserID,
				ReadAt:    time.Now(),
			}

		case "presence":
			// Handle presence updates (online/offline)
			isOnline := incoming.Status == "online"
			c.Hub.Presence <- models.PresenceEvent{
				UserID:   c.UserID,
				IsOnline: isOnline,
				LastSeen: time.Now(),
			}

		case "call_offer", "call_answer", "ice_candidate", "call_end", "call_reject":
			// Forward call signaling to the target user
			c.Hub.CallSignal <- models.CallSignal{
				Type:      incoming.Type,
				FromID:    c.UserID,
				ToID:      incoming.ToID,
				FromName:  incoming.FromName,
				CallType:  incoming.CallType,
				SDP:       incoming.SDP,
				Candidate: incoming.Candidate,
				CallID:    incoming.CallID,
			}

		case "message", "":
			// Handle regular messages (or messages without type field)
			if incoming.Content == "" {
				continue // Skip empty messages
			}
			msg := models.Message{
				ChatID:     incoming.ChatID,
				MessageID:  gocql.TimeUUID(),
				SenderID:   c.UserID,
				ReceiverID: incoming.ReceiverID,
				Content:    incoming.Content,
				Type:       models.MessageTypeText,
				Status:     models.MessageStatusSent,
				ReplyTo:    incoming.ReplyTo,
				ReplyText:  incoming.ReplyText,
				CreatedAt:  time.Now(),
			}

			// Persist to ScyllaDB
			if db.ScyllaSession != nil {
				if err := db.ScyllaSession.Query(`
					INSERT INTO messages (chat_id, message_id, sender_id, receiver_id, content, created_at)
					VALUES (?, ?, ?, ?, ?, ?)`,
					msg.ChatID, msg.MessageID, msg.SenderID, msg.ReceiverID, msg.Content, msg.CreatedAt).Exec(); err != nil {
					log.Printf("Error saving to Scylla: %v", err)
				}
			} else {
				log.Println("⚠️ ScyllaDB not connected, message not persisted")
			}

			c.Hub.Broadcast <- msg

		default:
			log.Printf("Unknown message type: %s", incoming.Type)
		}
	}
}

func (c *Client) getUserName() string {
	// TODO: Cache this or get from Redis
	return "User"
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Send each message as a separate WebSocket frame
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
