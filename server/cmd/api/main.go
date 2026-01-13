package main

import (
	"log"
	"os"

	"whatsapp-clone/internal/auth"
	"whatsapp-clone/internal/chat"
	"whatsapp-clone/internal/contacts"
	"whatsapp-clone/internal/db"
	"whatsapp-clone/internal/groups"
	"whatsapp-clone/internal/messages"
	"whatsapp-clone/internal/middleware"
	"whatsapp-clone/internal/profile"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect to Databases
	db.ConnectMongo()
	db.ConnectScylla()
	db.ConnectRedis()

	app := fiber.New(fiber.Config{
		BodyLimit: 50 * 1024 * 1024, // 50MB for file uploads
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-User-ID, user_id",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: false,
	}))

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("ChatterBox API Running")
	})

	// Auth Routes
	app.Post("/api/signup", auth.Signup)
	app.Post("/api/login", auth.Login)
	app.Get("/api/users", auth.GetUsers)
	app.Get("/api/search-user", auth.SearchUserByPhone)

	// Profile Routes
	app.Get("/api/profile", middleware.AuthMiddleware, profile.GetProfile)
	app.Put("/api/profile", middleware.AuthMiddleware, profile.UpdateProfile)
	app.Get("/api/user/:id/status", middleware.AuthMiddleware, profile.GetUserStatus)

	// Contact Routes
	app.Post("/api/contacts", middleware.AuthMiddleware, contacts.AddContact)
	app.Get("/api/contacts", middleware.AuthMiddleware, contacts.GetContacts)
	app.Delete("/api/contacts/:id", middleware.AuthMiddleware, contacts.DeleteContact)

	// Group Routes
	app.Post("/api/groups", middleware.AuthMiddleware, groups.CreateGroup)
	app.Get("/api/groups", middleware.AuthMiddleware, groups.GetGroups)
	app.Get("/api/groups/:id", middleware.AuthMiddleware, groups.GetGroup)
	app.Put("/api/groups/:id", middleware.AuthMiddleware, groups.UpdateGroup)
	app.Post("/api/groups/:id/members", middleware.AuthMiddleware, groups.AddMembers)
	app.Delete("/api/groups/:id/leave", middleware.AuthMiddleware, groups.LeaveGroup)

	// Message Routes
	app.Get("/api/messages/:userId", middleware.AuthMiddleware, messages.GetChatHistory)
	app.Get("/api/recent-chats", middleware.AuthMiddleware, messages.GetRecentChats)

	// WebSocket Hub
	hub := chat.NewHub()
	go hub.Run()

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", chat.Handler(hub))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}
