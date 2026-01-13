package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Contact struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	OwnerID     string             `json:"owner_id" bson:"owner_id"`       // User who saved the contact
	ContactID   string             `json:"contact_id" bson:"contact_id"`   // The user being saved
	DisplayName string             `json:"display_name" bson:"display_name"` // Custom name given by owner
	Phone       string             `json:"phone" bson:"phone"`             // Phone number of contact
}
