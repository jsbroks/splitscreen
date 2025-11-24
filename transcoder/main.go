package main

import (
	"context"
	"database/sql"
	"path/filepath"

	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"
	"transcoder/pkg/config"
	"transcoder/pkg/db"
	"transcoder/pkg/queue"
	"transcoder/pkg/storage"
	"transcoder/pkg/transcoder"

	"github.com/charmbracelet/log"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Info("signal received, shutting down...")
		cancel()
	}()

	sqlDB, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer sqlDB.Close()

	log.Info("database connected", "max_conns", sqlDB.Stats().MaxOpenConnections)

	// Instantiate Syncer and Transcoder
	s3sync, err := storage.NewS3Syncer(ctx, storage.S3Options{
		Region:          cfg.S3Region,
		Endpoint:        cfg.S3Endpoint,
		UsePathStyle:    cfg.S3ForcePathStyle,
		AccessKeyID:     cfg.S3AccessKey,
		SecretAccessKey: cfg.S3SecretKey,
		// ACL and CacheControl can be configured later via env/config if needed
	})
	if err != nil {
		log.Fatal("failed to create S3 syncer", "error", err)
	}
	ff := transcoder.NewFFmpegTranscoder(cfg.FFmpegPath, cfg.FFprobePath)
	log.Info("syncer and ffmpeg transcoder initialized",
		"s3_endpoint", cfg.S3Endpoint,
		"s3_region", cfg.S3Region,
		"ffmpeg", cfg.FFmpegPath,
		"ffprobe", cfg.FFprobePath,
	)

	// Concurrency limiter (default to small multiple of CPUs)
	workerLimit := max(2, runtime.GOMAXPROCS(0))
	sem := make(chan struct{}, workerLimit)

	log.Info("queue worker started", "concurrency", workerLimit)
	for {
		select {
		case <-ctx.Done():
			log.Warn("context cancelled, exiting queue loop")
			return
		default:
		}

		job, err := queue.ClaimNext(ctx, sqlDB)
		if err != nil {
			if err == sql.ErrNoRows {
				time.Sleep(1 * time.Second)
				continue
			}
			log.Warn("claim next error", "error", err)
			time.Sleep(2 * time.Second)
			continue
		}

		sem <- struct{}{}
		go func(j *queue.TranscodeJob) {
			defer func() { <-sem }()
			processJob(ctx, sqlDB, j, ff, s3sync, cfg)
		}(job)
	}
}

var defaultRenditions = []transcoder.Rendition{
	{
		Height: 720,
		VideoBitrateKbps: 1000,
		AudioBitrateKbps: 128,
	},
}

func processJob(
	ctx context.Context, 
	sqlDB *sql.DB, 
	j *queue.TranscodeJob, 
	t transcoder.Transcoder, 
	s *storage.S3Syncer, 
	cfg *config.Config,
) {
	start := time.Now()
	log.Info("processing job", "id", j.ID, "video", j.VideoID, "input", j.InputKey)

	inputPath := j.InputKey
	// Create a temporary output directory for this job. It will be cleaned up after.
	outputPath, err := os.MkdirTemp("", "transcode-*")
	if err != nil {
		log.Error("create temp dir error", "id", j.ID, "error", err)
		return
	}
	defer func() {
		if rmErr := os.RemoveAll(outputPath); rmErr != nil {
			log.Warn("failed to cleanup temp dir", "path", outputPath, "error", rmErr)
		}
	}()

	err = t.TranscodeHLS(ctx, inputPath, outputPath, defaultRenditions)
	if err != nil {
		log.Error("transcode error", "id", j.ID, "error", err)
		return
	}

	err = t.GenerateHoverPreview(
		ctx, inputPath, 
		filepath.Join(outputPath, "hover.webm"), filepath.Join(outputPath, "hover.mp4"), 
		5*time.Second, 720, 24,
	)
	if err != nil {
		log.Error("generate hover preview error", "id", j.ID, "error", err)
		return
	}

	err = s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
	if err != nil {
		log.Error("sync error", "id", j.ID, "error", err)
		return
	}

	if err := queue.Complete(ctx, sqlDB, j.ID); err != nil {
		log.Error("complete error for job", "id", j.ID, "error", err)
		return
	}
	log.Info("job done", "id", j.ID, "duration", time.Since(start).Truncate(time.Millisecond))
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
