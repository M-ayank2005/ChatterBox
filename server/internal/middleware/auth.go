package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// Simple auth middleware - extracts user_id from headers
// In production, validate JWT token here
func AuthMiddleware(c *fiber.Ctx) error {
	userID := c.Get("user_id")
	if userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	
	// Store user_id in context for handlers to access
	c.Locals("user_id", userID)
	return c.Next()
}
