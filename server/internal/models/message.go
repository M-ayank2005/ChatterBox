package models

import (
	"time"

	"github.com/gocql/gocql"
)

type MessageType string
type MessageStatus string

const (
	MessageTypeText  MessageType = "text"
	MessageTypeImage MessageType = "image"
	MessageTypeFile  MessageType = "file"
	MessageTypeAudio MessageType = "audio"
	MessageTypeVideo MessageType = "video"
)

const (
	MessageStatusSent      MessageStatus = "sent"
	MessageStatusDelivered MessageStatus = "delivered"
	MessageStatusRead      MessageStatus = "read"
)

type Message struct {
	ChatID     string        `json:"chat_id"`
	MessageID  gocql.UUID    `json:"message_id"`
	SenderID   string        `json:"sender_id"`
	ReceiverID string        `json:"receiver_id"`
	Content    string        `json:"content"`
	Type       MessageType   `json:"type"`
	Status     MessageStatus `json:"status"`
	ReplyTo    string        `json:"reply_to,omitempty"` // Message ID being replied to
	ReplyText  string        `json:"reply_text,omitempty"` // Preview of replied message
	MediaURL   string        `json:"media_url,omitempty"`
	FileName   string        `json:"file_name,omitempty"`
	FileSize   int64         `json:"file_size,omitempty"`
	IsGroup    bool          `json:"is_group"`
	IsDeleted  bool          `json:"is_deleted"`
	DeletedFor []string      `json:"deleted_for,omitempty"`
	CreatedAt  time.Time     `json:"created_at"`
	EditedAt   time.Time     `json:"edited_at,omitempty"`
}

type TypingEvent struct {
	UserID   string `json:"user_id"`
	ChatID   string `json:"chat_id"`
	Username string `json:"username"`
	IsTyping bool   `json:"is_typing"`
}

type PresenceEvent struct {
	UserID   string    `json:"user_id"`
	IsOnline bool      `json:"is_online"`
	LastSeen time.Time `json:"last_seen"`
}

type ReadReceipt struct {
	MessageID string    `json:"message_id"`
	ChatID    string    `json:"chat_id"`
	ReaderID  string    `json:"reader_id"`
	ReadAt    time.Time `json:"read_at"`
}

// WebRTC Call signaling
type CallSignal struct {
	Type       string `json:"type"`       // call_offer, call_answer, ice_candidate, call_end, call_reject
	FromID     string `json:"from_id"`
	ToID       string `json:"to_id"`
	FromName   string `json:"from_name"`
	CallType   string `json:"call_type"`  // audio, video
	SDP        string `json:"sdp,omitempty"`
	Candidate  string `json:"candidate,omitempty"`
	CallID     string `json:"call_id"`
}

