package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// Open creates a database/sql client (lib/pq) from a DATABASE_URL and verifies connectivity.
func Open(ctx context.Context, databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	// Reasonable defaults; adjust with DB params if needed.
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	// Verify connectivity with timeout.
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, fmt.Errorf("db ping: %w", err)
	}
	return db, nil
}
