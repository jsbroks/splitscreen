package main

import (
	"context"
	"database/sql"
	"fmt"
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
			result := processJob(ctx, sqlDB, j, ff, s3sync, cfg)
			if result != nil {
				log.Error("job error", "id", j.ID, "error", result)
				queue.Fail(ctx, sqlDB, j.ID, result.Error())
			}
		}(job)
	}
}

// Quality ladder from highest to lowest
// These will be filtered based on source resolution (never upscale)
var qualityLadder = []transcoder.Rendition{
	{
		Height:           2160, // 4K
		VideoBitrateKbps: 8000,
		AudioBitrateKbps: 128,
		CRF:              23,
		FPS:              30,
	},
	{
		Height:           1440, // 2K
		VideoBitrateKbps: 6000,
		AudioBitrateKbps: 128,
		CRF:              23,
		FPS:              30,
	},
	{
		Height:           1080, // Full HD
		VideoBitrateKbps: 4500,
		AudioBitrateKbps: 128,
		CRF:              23,
		FPS:              30,
	},
	{
		Height:           720, // HD
		VideoBitrateKbps: 2500,
		AudioBitrateKbps: 128,
		CRF:              23,
		FPS:              30,
	},
	{
		Height:           480, // SD
		VideoBitrateKbps: 1200,
		AudioBitrateKbps: 96,
		CRF:              23,
		FPS:              30,
	},
	{
		Height:           360, // Low
		VideoBitrateKbps: 800,
		AudioBitrateKbps: 96,
		CRF:              23,
		FPS:              30,
	},
	{
		Height:           240, // Very Low
		VideoBitrateKbps: 400,
		AudioBitrateKbps: 64,
		CRF:              23,
		FPS:              30,
	},
}

// filterRenditionsBySourceHeight returns only renditions that are at or below the source height
// This prevents upscaling
func filterRenditionsBySourceHeight(sourceHeight int, ladder []transcoder.Rendition) []transcoder.Rendition {
	if sourceHeight <= 0 {
		// If we can't determine source height, use a reasonable default
		return []transcoder.Rendition{ladder[3]} // 720p
	}

	var filtered []transcoder.Rendition
	for _, r := range ladder {
		if r.Height <= sourceHeight {
			filtered = append(filtered, r)
		}
	}

	// Always include at least one rendition (the lowest quality if source is very small)
	if len(filtered) == 0 && len(ladder) > 0 {
		filtered = []transcoder.Rendition{ladder[len(ladder)-1]}
	}

	return filtered
}

func processJob(
	ctx context.Context,
	sqlDB *sql.DB,
	j *queue.TranscodeJob,
	t transcoder.Transcoder,
	s *storage.S3Syncer,
	cfg *config.Config,
) error {
	start := time.Now()
	log.Info("processing job", "id", j.ID, "video", j.VideoID, "input", j.InputKey)

	// Set video status to processing
	if err := db.SetVideoProcessing(ctx, sqlDB, j.VideoID); err != nil {
		log.Error("failed to set video processing status", "id", j.ID, "video", j.VideoID, "error", err)
		// Continue anyway, don't fail the job for this
	}

	inputPath := j.InputKey

	// Wait for the input file to exist in S3 (upload might still be in progress)
	log.Info("waiting for input file in S3", "id", j.ID, "bucket", cfg.S3Bucket, "key", inputPath)
	maxWait := 10 * time.Minute
	waitStart := time.Now()
	for {
		exists, err := s.FileExists(ctx, cfg.S3Bucket, inputPath)
		if err != nil {
			log.Error("error checking file existence", "id", j.ID, "error", err)
			return err
		}
		if exists {
			log.Info("input file found in S3", "id", j.ID, "waited", time.Since(waitStart).Truncate(time.Millisecond))
			break
		}

		if time.Since(waitStart) > maxWait {
			log.Error("timeout waiting for input file", "id", j.ID, "max_wait", maxWait)
			return fmt.Errorf("timeout waiting for input file")
		}

		select {
		case <-ctx.Done():
			log.Warn("context cancelled while waiting for file", "id", j.ID)
			return fmt.Errorf("context cancelled")
		case <-time.After(1 * time.Second):
			// Continue polling
		}
	}

	// Create a temporary working directory for this job
	workDir, err := os.MkdirTemp("", "transcode-*")
	if err != nil {
		log.Error("create temp dir error", "id", j.ID, "error", err)
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer func() {
		if rmErr := os.RemoveAll(workDir); rmErr != nil {
			log.Warn("failed to cleanup temp dir", "path", workDir, "error", rmErr)
		}
	}()

	// Download the input file from S3
	localInputPath := filepath.Join(workDir, "input"+filepath.Ext(inputPath))
	log.Info("downloading input file", "id", j.ID, "from", inputPath, "to", localInputPath)
	if err := s.DownloadFile(ctx, cfg.S3Bucket, inputPath, localInputPath); err != nil {
		log.Error("download error", "id", j.ID, "error", err)
		return fmt.Errorf("download input: %w", err)
	}

	// Create output directory within work directory
	outputPath := filepath.Join(workDir, "output")
	if err := os.MkdirAll(outputPath, 0755); err != nil {
		log.Error("create output dir error", "id", j.ID, "error", err)
		return fmt.Errorf("create output dir: %w", err)
	}

	// Probe source video to determine appropriate quality ladder
	log.Info("probing source video", "id", j.ID, "path", localInputPath)
	sourceInfo, err := t.ProbeVideo(ctx, localInputPath)
	if err != nil {
		log.Error("probe error", "id", j.ID, "error", err)
		// Mark video as failed
		if statusErr := db.SetVideoFailed(ctx, sqlDB, j.VideoID); statusErr != nil {
			log.Error("failed to set video failed status", "id", j.ID, "video", j.VideoID, "error", statusErr)
		}
		return fmt.Errorf("probe video: %w", err)
	}
	log.Info("source video info", "id", j.ID, "width", sourceInfo.Width, "height", sourceInfo.Height, "duration", sourceInfo.DurationSec)

	// Update video metadata (duration)
	durationSecs := int(sourceInfo.DurationSec)
	if err := db.UpdateVideoMetadata(ctx, sqlDB, j.VideoID, durationSecs, 0); err != nil {
		log.Error("failed to update video metadata", "id", j.ID, "video", j.VideoID, "error", err)
		// Continue anyway, don't fail the job for this
	}

	// Filter renditions to prevent upscaling
	renditions := filterRenditionsBySourceHeight(sourceInfo.Height, qualityLadder)
	log.Info("selected renditions", "id", j.ID, "count", len(renditions), "heights", getRenditionHeights(renditions))

	// Run transcoding tasks concurrently for faster processing
	type taskResult struct {
		name string
		err  error
	}

	taskCount := 4
	results := make(chan taskResult, taskCount)

	// Task 1: HLS transcoding (usually the longest)
	go func() {
		log.Info("starting HLS transcode", "id", j.ID)
		err := t.TranscodeHLS(ctx, localInputPath, outputPath, renditions)
		if err != nil {
			log.Error("transcode error", "id", j.ID, "error", err)
		} else {
			log.Info("HLS transcode complete", "id", j.ID)
		}
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		results <- taskResult{"HLS transcode", err}
	}()

	// Task 2: Hover preview generation
	go func() {
		log.Info("starting hover preview generation", "id", j.ID)
		err := t.GenerateHoverPreview(
			ctx, localInputPath,
			filepath.Join(outputPath, "hover.webm"), filepath.Join(outputPath, "hover.mp4"),
			5*time.Second,
			720, 24,
		)
		if err != nil {
			log.Error("generate hover preview error", "id", j.ID, "error", err)
		} else {
			log.Info("hover preview complete", "id", j.ID)
		}
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		results <- taskResult{"hover preview", err}
	}()

	// Task 3: Thumbnail and VTT generation
	go func() {
		log.Info("starting thumbnail generation", "id", j.ID)
		thumbsDir := filepath.Join(outputPath, "thumbnails")
		err := t.GenerateThumbnailsAndVTT(
			ctx, localInputPath,
			thumbsDir,
			filepath.Join(outputPath, "thumbnails.vtt"),
			100, // Thumbnail height in pixels
			100, // Maximum number of thumbnails (will be less for shorter videos)
		)
		if err != nil {
			log.Error("generate thumbnails and vtt error", "id", j.ID, "error", err)
		} else {
			log.Info("thumbnails and VTT complete", "id", j.ID)
		}
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		results <- taskResult{"thumbnails and VTT", err}
	}()

	// Generate a thumbnail at 25% of the video's duration
	go func() {
		log.Info("starting 25pct thumbnail generation", "id", j.ID)
		// Probe video info to get duration
		info, err := t.ProbeVideo(ctx, localInputPath)
		if err != nil {
			log.Error("failed to probe video for 25pct thumbnail", "id", j.ID, "error", err)
			results <- taskResult{"25pct thumbnail", err}
			return
		}
		thumbTime := time.Duration(info.DurationSec*0.25*float64(time.Second)) // 25% point
		thumbPath := filepath.Join(outputPath, "thumb_25pct.jpg")
		err = t.GeneratePoster(ctx, localInputPath, thumbPath, thumbTime, 480)
		if err != nil {
			log.Error("generate 25pct thumbnail error", "id", j.ID, "error", err)
		} else {
			log.Info("25pct thumbnail complete", "id", j.ID, "path", thumbPath)
		}
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		results <- taskResult{"25pct thumbnail", err}
	}()

	// Wait for all tasks to complete and collect errors
	var taskErrors []error
	for range taskCount {
		result := <-results
		if result.err != nil {
			taskErrors = append(taskErrors, fmt.Errorf("%s: %w", result.name, result.err))
		}
	}

	// If any task failed, mark video as failed and return the first error
	if len(taskErrors) > 0 {
		log.Error("one or more transcoding tasks failed", "id", j.ID, "errors", len(taskErrors))
		if statusErr := db.SetVideoFailed(ctx, sqlDB, j.VideoID); statusErr != nil {
			log.Error("failed to set video failed status", "id", j.ID, "video", j.VideoID, "error", statusErr)
		}
		return taskErrors[0]
	}

	log.Info("all transcoding tasks complete", "id", j.ID)

	err = s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
	if err != nil {
		log.Error("sync error", "id", j.ID, "error", err)
		return fmt.Errorf("sync: %w", err)
	}

	if err := queue.Complete(ctx, sqlDB, j.ID); err != nil {
		log.Error("complete error for job", "id", j.ID, "error", err)
		return fmt.Errorf("complete: %w", err)
	}

	// Mark video as in_review (ready for manual review/approval)
	if err := db.SetVideoInReview(ctx, sqlDB, j.VideoID); err != nil {
		log.Error("failed to set video in_review status", "id", j.ID, "video", j.VideoID, "error", err)
		// Continue anyway - video is processed successfully
	}

	log.Info("job done", "id", j.ID, "video", j.VideoID, "status", "in_review", "duration", time.Since(start).Truncate(time.Millisecond))
	return nil
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Helper function to extract heights from renditions for logging
func getRenditionHeights(renditions []transcoder.Rendition) []int {
	heights := make([]int, len(renditions))
	for i, r := range renditions {
		heights[i] = r.Height
	}
	return heights
}
