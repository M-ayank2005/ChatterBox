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

	// Retry loop for ScyllaDB connection (it takes time to start up)
	var initSession *gocql.Session
	var err error
	maxRetries := 10
	
	for i := 0; i < maxRetries; i++ {
		initCluster := gocql.NewCluster(hosts)
		initCluster.ProtoVersion = 4
		initCluster.ConnectTimeout = 10 * time.Second
		initSession, err = initCluster.CreateSession()
		if err == nil {
			break
		}
		log.Printf("⚠️ Could not connect to ScyllaDB (attempt %d/%d): %v. Retrying in 5s...", i+1, maxRetries, err)
		time.Sleep(5 * time.Second)
	}
	
	if err != nil || initSession == nil {
		log.Printf("⚠️ Failed to connect to ScyllaDB after %d attempts. Messages will not be persisted.", maxRetries)
		return
	}
	defer initSession.Close()

	err = initSession.Query(`CREATE KEYSPACE IF NOT EXISTS whatsapp WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`).Exec()
	if err != nil {
		log.Printf("Error creating keyspace: %v", err)
	}

	cluster := gocql.NewCluster(hosts)
	cluster.Keyspace = "whatsapp"
	cluster.Consistency = gocql.Quorum
	cluster.ProtoVersion = 4
	cluster.ConnectTimeout = 10 * time.Second

	session, err := cluster.CreateSession()
	if err != nil {
		log.Printf("⚠️ Error connecting to ScyllaDB keyspace: %v", err)
		return
	}

    // Create Messages Table
    err = session.Query(`
        CREATE TABLE IF NOT EXISTS messages (
            chat_id text,
            message_id timeuuid,
            sender_id text,
            receiver_id text,
            content text,
            created_at timestamp,
            PRIMARY KEY (chat_id, message_id)
        ) WITH CLUSTERING ORDER BY (message_id DESC);
    `).Exec()

    if err != nil {
         log.Printf("Error creating messages table: %v", err)
    }
    
    // Attempt migration for existing table
    // Ignore error if column exists
    session.Query(`ALTER TABLE messages ADD receiver_id text`).Exec()

	ScyllaSession = session
	fmt.Println("✅ Connected to ScyllaDB")
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
		log.Fatalf("Error connecting to Redis: %v", err)
	}

	fmt.Println("✅ Connected to Redis")
}
