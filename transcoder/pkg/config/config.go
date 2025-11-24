package config

import (
	"context"

	"github.com/sethvargo/go-envconfig"
)

type Config struct {
	DatabaseURL string `env:"DATABASE_URL,required"`

	FFmpegPath  string `env:"FFMPEG_PATH,required"`
	FFprobePath string `env:"FFPROBE_PATH,required"`

	S3Endpoint       string `env:"S3_ENDPOINT,required"`
	S3AccessKey      string `env:"S3_ACCESS_KEY_ID,required"`
	S3SecretKey      string `env:"S3_SECRET_ACCESS_KEY,required"`
	S3Bucket         string `env:"S3_BUCKET,required"`
	S3Region         string `env:"S3_REGION,required"`
	S3SSL            bool   `env:"S3_SSL,default=false"`
	S3ForcePathStyle bool   `env:"S3_FORCE_PATH_STYLE,default=false"`
}

func Load() (*Config, error) {
	ctx := context.Background()
	var cfg Config
	if err := envconfig.Process(ctx, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
