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
	"golang.org/x/sys/unix"
)

// checkDiskSpace verifies there's enough free space in the directory
func checkDiskSpace(path string, minGB int) error {
	var stat unix.Statfs_t
	if err := unix.Statfs(path, &stat); err != nil {
		return fmt.Errorf("failed to check disk space: %w", err)
	}

	// Calculate available space in GB
	availableGB := float64(stat.Bavail*uint64(stat.Bsize)) / (1024 * 1024 * 1024)

	if availableGB < float64(minGB) {
		return fmt.Errorf("insufficient disk space: %.2f GB available, %d GB required", availableGB, minGB)
	}

	return nil
}

// logMemoryStats logs current memory usage
func logMemoryStats() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	log.Info("memory stats",
		"alloc_mb", m.Alloc/1024/1024,
		"total_alloc_mb", m.TotalAlloc/1024/1024,
		"sys_mb", m.Sys/1024/1024,
		"num_gc", m.NumGC,
	)
}

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
	ff.SetMaxParallelRenditions(cfg.MaxParallelRenditions)
	log.Info("syncer and ffmpeg transcoder initialized",
		"s3_endpoint", cfg.S3Endpoint,
		"s3_region", cfg.S3Region,
		"ffmpeg", cfg.FFmpegPath,
		"ffprobe", cfg.FFprobePath,
	)

	// Concurrency limiter - configurable or auto-detect based on CPUs
	workerLimit := cfg.WorkerConcurrency
	if workerLimit <= 0 {
		workerLimit = max(2, runtime.GOMAXPROCS(0))
	}
	sem := make(chan struct{}, workerLimit)

	log.Info("queue worker started",
		"concurrency", workerLimit,
		"max_parallel_tasks_per_job", cfg.MaxParallelTasksPerJob,
		"max_parallel_renditions", cfg.MaxParallelRenditions,
		"temp_dir_min_free_gb", cfg.TempDirMinFreeGB,
	)

	// Start periodic memory stats logging
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				logMemoryStats()
			}
		}
	}()
	for {
		select {
		case <-ctx.Done():
			log.Warn("context cancelled, exiting queue loop")
			return
		default:
		}

		// Pre-flight check: verify disk space BEFORE claiming job
		// Check temp directory location (os.TempDir returns the system temp directory)
		if err := checkDiskSpace(os.TempDir(), cfg.TempDirMinFreeGB); err != nil {
			log.Warn("insufficient disk space, waiting before retry", 
				"error", err,
				"min_required_gb", cfg.TempDirMinFreeGB,
			)
			time.Sleep(30 * time.Second) // Wait longer since this is a resource issue
			continue
		}

		// Acquire semaphore BEFORE claiming job - this ensures we only mark jobs as
		// "running" when we actually have compute capacity to process them
		sem <- struct{}{}
		
		job, err := queue.ClaimNext(ctx, sqlDB)
		if err != nil {
			<-sem // Release semaphore if we didn't get a job
			if err == sql.ErrNoRows {
				time.Sleep(1 * time.Second)
				continue
			}
			log.Warn("claim next error", "error", err)
			time.Sleep(2 * time.Second)
			continue
		}

		// Job is now marked as running and we have compute capacity + disk space
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

	// Create contextual logger with job_id and video_id for traceability
	jobLogger := log.With("job_id", j.ID, "video_id", j.VideoID)
	jobLogger.Info("processing job", "input", j.InputKey)

	inputPath := j.InputKey

	// Wait for the input file to exist in S3 (upload might still be in progress)
	jobLogger.Info("waiting for input file in S3", "bucket", cfg.S3Bucket, "key", inputPath)
	maxWait := 10 * time.Minute
	waitStart := time.Now()
	for {
		exists, err := s.FileExists(ctx, cfg.S3Bucket, inputPath)
		if err != nil {
			jobLogger.Error("error checking file existence", "error", err)
			return err
		}
		if exists {
			jobLogger.Info("input file found in S3", "waited", time.Since(waitStart).Truncate(time.Millisecond))
			break
		}

		if time.Since(waitStart) > maxWait {
			jobLogger.Error("timeout waiting for input file", "max_wait", maxWait)
			return fmt.Errorf("timeout waiting for input file")
		}

		select {
		case <-ctx.Done():
			jobLogger.Warn("context cancelled while waiting for file")
			return fmt.Errorf("context cancelled")
		case <-time.After(1 * time.Second):
			// Continue polling
		}
	}

	// Create a temporary working directory for this job
	workDir, err := os.MkdirTemp("", "transcode-*")
	if err != nil {
		jobLogger.Error("create temp dir error", "error", err)
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer func() {
		if rmErr := os.RemoveAll(workDir); rmErr != nil {
			jobLogger.Warn("failed to cleanup temp dir", "path", workDir, "error", rmErr)
		}
	}()

	// Final disk space verification (already checked before claiming, but verify again
	// in case space was consumed between initial check and temp dir creation)
	if err := checkDiskSpace(workDir, cfg.TempDirMinFreeGB); err != nil {
		jobLogger.Error("disk space verification failed", "error", err)
		return err
	}
	jobLogger.Info("disk space verified", "min_free_gb", cfg.TempDirMinFreeGB)

	// Download the input file from S3
	localInputPath := filepath.Join(workDir, "input"+filepath.Ext(inputPath))
	jobLogger.Info("downloading input file", "from", inputPath, "to", localInputPath)
	if err := s.DownloadFile(ctx, cfg.S3Bucket, inputPath, localInputPath); err != nil {
		jobLogger.Error("download error", "error", err)
		return fmt.Errorf("download input: %w", err)
	}

	// Create output directory within work directory
	outputPath := filepath.Join(workDir, "output")
	if err := os.MkdirAll(outputPath, 0755); err != nil {
		jobLogger.Error("create output dir error", "error", err)
		return fmt.Errorf("create output dir: %w", err)
	}

	// Probe source video to determine appropriate quality ladder
	jobLogger.Info("probing source video", "path", localInputPath)
	sourceInfo, err := t.ProbeVideo(ctx, localInputPath)
	if err != nil {
		jobLogger.Error("probe error", "error", err)
		return fmt.Errorf("probe video: %w", err)
	}
	jobLogger.Info("source video info", "width", sourceInfo.Width, "height", sourceInfo.Height, "duration", sourceInfo.DurationSec)

	// Get file size
	var fileSizeBytes int64
	if fileInfo, err := os.Stat(localInputPath); err != nil {
		jobLogger.Warn("failed to get file size", "error", err)
		fileSizeBytes = 0
	} else {
		fileSizeBytes = fileInfo.Size()
	}

	// Update video metadata (duration and size)
	durationSecs := int(sourceInfo.DurationSec)
	if err := db.UpdateVideoMetadata(ctx, sqlDB, j.VideoID, durationSecs, fileSizeBytes); err != nil {
		jobLogger.Error("failed to update video metadata", "error", err)
		// Continue anyway, don't fail the job for this
	} else {
		jobLogger.Info("updated video metadata", "duration_secs", durationSecs, "size_bytes", fileSizeBytes)
	}

	// Filter renditions to prevent upscaling
	renditions := filterRenditionsBySourceHeight(sourceInfo.Height, qualityLadder)
	jobLogger.Info("selected renditions", "count", len(renditions), "heights", getRenditionHeights(renditions))

	// Run transcoding tasks concurrently for faster processing
	// Use configurable concurrency to control memory usage
	type taskResult struct {
		name string
		err  error
	}

	taskCount := cfg.MaxParallelTasksPerJob
	results := make(chan taskResult, taskCount)
	taskSem := make(chan struct{}, taskCount) // Semaphore to limit concurrent tasks

	// Task 1: HLS transcoding (usually the longest)
	taskSem <- struct{}{}
	go func() {
		defer func() { <-taskSem }()
		taskStart := time.Now()
		jobLogger.Info("starting HLS transcode", "renditions", len(renditions))
		queue.UpdateHLSStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusProcessing)

		// Start a heartbeat goroutine for long-running transcode
		heartbeatDone := make(chan struct{})
		go func() {
			ticker := time.NewTicker(30 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-heartbeatDone:
					return
				case <-ticker.C:
					elapsed := time.Since(taskStart).Truncate(time.Second)
					jobLogger.Info("HLS transcode in progress", "elapsed", elapsed, "renditions", len(renditions))
				}
			}
		}()

		err := t.TranscodeHLS(ctx, localInputPath, outputPath, renditions)
		close(heartbeatDone)

		jobLogger.Info("HLS syncing directory")
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		jobLogger.Info("HLS syncing directory complete")

		if err != nil {
			jobLogger.Error("transcode error", "error", err, "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdateHLSStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusFailed)
		} else {
			jobLogger.Info("HLS transcode complete", "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdateHLSStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusDone)
		}

		results <- taskResult{"HLS transcode", err}
	}()

	// Task 2: Hover preview generation
	taskSem <- struct{}{}
	go func() {
		defer func() { <-taskSem }()
		taskStart := time.Now()
		jobLogger.Info("starting hover preview generation")
		queue.UpdateHoverPreviewStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusProcessing)
		err := t.GenerateHoverPreview(
			ctx, localInputPath,
			filepath.Join(outputPath, "hover.webm"), filepath.Join(outputPath, "hover.mp4"),
			5*time.Second,
			720, 24,
		)

		jobLogger.Info("hover preview syncing directory")
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		jobLogger.Info("hover preview syncing directory complete")

		if err != nil {
			jobLogger.Error("generate hover preview error", "error", err, "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdateHoverPreviewStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusFailed)
		} else {
			jobLogger.Info("hover preview complete", "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdateHoverPreviewStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusDone)
		}

		results <- taskResult{"hover preview", err}
	}()

	// Task 3: Thumbnail and VTT generation
	taskSem <- struct{}{}
	go func() {
		defer func() { <-taskSem }()
		taskStart := time.Now()
		jobLogger.Info("starting thumbnail generation")
		queue.UpdateScrubberPreviewStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusProcessing)
		thumbsDir := filepath.Join(outputPath, "thumbnails")
		err := t.GenerateThumbnailsAndVTT(
			ctx, localInputPath,
			thumbsDir,
			filepath.Join(outputPath, "thumbnails.vtt"),
			100, // Thumbnail height in pixels
			100, // Maximum number of thumbnails (will be less for shorter videos)
		)

		jobLogger.Info("thumbnails and VTT syncing directory")
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		jobLogger.Info("thumbnails and VTT syncing directory complete")

		if err != nil {
			jobLogger.Error("generate thumbnails and vtt error", "error", err, "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdateScrubberPreviewStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusFailed)
		} else {
			jobLogger.Info("thumbnails and VTT complete", "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdateScrubberPreviewStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusDone)
		}

		results <- taskResult{"thumbnails and VTT", err}
	}()

	// Generate a thumbnail at 25% of the video's duration
	taskSem <- struct{}{}
	go func() {
		defer func() { <-taskSem }()
		taskStart := time.Now()
		jobLogger.Info("starting 25pct thumbnail generation")
		queue.UpdatePosterStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusProcessing)
		// Probe video info to get duration
		info, err := t.ProbeVideo(ctx, localInputPath)
		if err != nil {
			jobLogger.Error("failed to probe video for 25pct thumbnail", "error", err, "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdatePosterStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusFailed)
			results <- taskResult{"25pct thumbnail", err}
			return
		}
		thumbTime := time.Duration(info.DurationSec * 0.25 * float64(time.Second)) // 25% point
		thumbPath := filepath.Join(outputPath, "thumb_25pct.jpg")
		err = t.GeneratePoster(ctx, localInputPath, thumbPath, thumbTime, 480)

		jobLogger.Info("25pct thumbnail syncing directory")
		s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
		jobLogger.Info("25pct thumbnail syncing directory complete")
	
		if err != nil {
			jobLogger.Error("generate 25pct thumbnail error", "error", err, "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdatePosterStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusFailed)
		} else {
			jobLogger.Info("25pct thumbnail complete", "path", thumbPath, "duration", time.Since(taskStart).Truncate(time.Millisecond))
			queue.UpdatePosterStatus(ctx, sqlDB, j.ID, queue.ProcessingStatusDone)
		}

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
		jobLogger.Error("one or more transcoding tasks failed", "errors", len(taskErrors))
		return taskErrors[0]
	}

	jobLogger.Info("all transcoding tasks complete")

	jobLogger.Info("syncing output directory")
	err = s.SyncDirectory(ctx, outputPath, cfg.S3Bucket, j.OutputPrefix)
	if err != nil {
		jobLogger.Error("sync error", "error", err)
		return fmt.Errorf("sync: %w", err)
	}
	jobLogger.Info("output directory synced")

	if err := queue.Complete(ctx, sqlDB, j.ID); err != nil {
		jobLogger.Error("complete error for job", "error", err)
		return fmt.Errorf("complete: %w", err)
	}

	jobLogger.Info("job done", "status", "in_review", "duration", time.Since(start).Truncate(time.Millisecond))
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
