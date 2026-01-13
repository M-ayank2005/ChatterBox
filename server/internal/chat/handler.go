package chat

import (
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func Handler(hub *Hub) fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
        // Authenticate via Query Param or Headers (WS doesn't support headers easily in browser JS API, usually query param or initial handshake)
        // For MVP, lets assume user sends token or ID in query param ?token=... or ?user_id=...
        // SECURITY NOTE: In production, validate JWT token here.
        userID := c.Query("user_id")
        if userID == "" {
            log.Println("No user_id provided")
            c.Close()
            return
        }

		log.Printf("🔌 WebSocket connection from user: %s", userID)
		client := &Client{Hub: hub, Conn: c, Send: make(chan []byte, 256), UserID: userID}
		client.Hub.Register <- client
		log.Printf("✅ Client registered for user: %s", userID)

		go client.WritePump()
		client.ReadPump()
	})
}
