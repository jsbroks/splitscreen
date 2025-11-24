package main

import (
	"fmt"
	"log"
	"transcoder/pkg/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(cfg.DatabaseURL)
}