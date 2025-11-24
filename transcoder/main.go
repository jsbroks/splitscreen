package main

import (
	"context"
	"fmt"
	"log"
	"transcoder/pkg/config"
	"transcoder/pkg/db"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	sqlDB, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer sqlDB.Close()

	fmt.Println("database: connected")
}