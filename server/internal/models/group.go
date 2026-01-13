package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Group struct {
	ID          primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Name        string               `json:"name" bson:"name"`
	Description string               `json:"description" bson:"description"`
	Avatar      string               `json:"avatar" bson:"avatar"`
	CreatorID   primitive.ObjectID   `json:"creator_id" bson:"creator_id"`
	Admins      []primitive.ObjectID `json:"admins" bson:"admins"`
	Members     []primitive.ObjectID `json:"members" bson:"members"`
	CreatedAt   time.Time            `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at" bson:"updated_at"`
}

type GroupMember struct {
	UserID   primitive.ObjectID `json:"user_id" bson:"user_id"`
	Role     string             `json:"role" bson:"role"` // admin, member
	JoinedAt time.Time          `json:"joined_at" bson:"joined_at"`
}
