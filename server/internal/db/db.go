package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gocql/gocql"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	MongoClient *mongo.Client
	ScyllaSession *gocql.Session
	RedisClient *redis.Client
)

func ConnectMongo() {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		log.Fatal("MONGO_URI is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalf("Error connecting to MongoDB: %v", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("Error pinging MongoDB: %v", err)
	}

	MongoClient = client
	fmt.Println("✅ Connected to MongoDB Atlas")
}

func ConnectScylla() {
	hosts := os.Getenv("SCYLLA_HOSTS")
	if hosts == "" {
		hosts = "localhost"
	}

	// Skip ScyllaDB connection for faster startup - it's optional
	log.Printf("⚠️ ScyllaDB connection skipped. Messages will not be persisted to ScyllaDB.")
	return
}

func ConnectRedis() {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr: addr,
	})

	ctx := context.Background()
	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		log.Printf("⚠️ Could not connect to Redis: %v. Redis features will be disabled.", err)
		return
	}

	fmt.Println("✅ Connected to Redis")
}
