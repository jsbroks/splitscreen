package config

import (
	"context"

	"github.com/sethvargo/go-envconfig"
)



type Config struct {
	DatabaseURL string `env:"DATABASE_URL,required"`
}

func Load() (*Config, error) {
	ctx := context.Background()
	var cfg Config
	if err := envconfig.Process(ctx, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}