package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Username  string             `json:"username" bson:"username"`
	Phone     string             `json:"phone" bson:"phone"`
	Bio       string             `json:"bio" bson:"bio"`
	Password  string             `json:"-" bson:"password"`
	Avatar    string             `json:"avatar" bson:"avatar"`
	IsOnline  bool               `json:"is_online" bson:"is_online"`
	LastSeen  time.Time          `json:"last_seen" bson:"last_seen"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

type UserStatus struct {
	UserID   string    `json:"user_id"`
	IsOnline bool      `json:"is_online"`
	LastSeen time.Time `json:"last_seen"`
}

