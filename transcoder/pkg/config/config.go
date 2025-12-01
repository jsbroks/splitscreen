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

	// Resource Controls
	WorkerConcurrency      int `env:"WORKER_CONCURRENCY,default=0"` // 0 = auto-detect based on CPUs
	MaxParallelRenditions  int `env:"MAX_PARALLEL_RENDITIONS,default=2"`
	MaxParallelTasksPerJob int `env:"MAX_PARALLEL_TASKS_PER_JOB,default=2"`
	TempDirMinFreeGB       int `env:"TEMP_DIR_MIN_FREE_GB,default=10"`
}

func Load() (*Config, error) {
	ctx := context.Background()
	var cfg Config
	if err := envconfig.Process(ctx, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
