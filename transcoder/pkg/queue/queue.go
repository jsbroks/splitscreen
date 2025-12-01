package queue

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type Status string

const (
	StatusQueued  Status = "queued"
	StatusRunning Status = "running"
	StatusDone    Status = "done"
	StatusFailed  Status = "failed"
)

type TranscodeJob struct {
	ID           string
	VideoID      string
	InputKey     string
	OutputPrefix string
	Attempts     int
}

// ClaimNext atomically claims the oldest queued job using SKIP LOCKED pattern.
// Returns sql.ErrNoRows if no jobs are available.
func ClaimNext(ctx context.Context, db *sql.DB) (*TranscodeJob, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()
	var j TranscodeJob
	// Select the next job, lock it, and mark as running.
	// Note: updated_at and started_at are maintained for observability.
	row := tx.QueryRowContext(ctx, `
		WITH next AS (
			SELECT id
			FROM transcode_queue
			WHERE status = $1
			ORDER BY created_at ASC
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		UPDATE transcode_queue q
		SET status = $2,
		    attempts = q.attempts + 1,
		    started_at = NOW(),
		    updated_at = NOW()
		FROM next
		WHERE q.id = next.id
		RETURNING q.id, q.video_id, q.input_key, q.output_prefix, q.attempts
	`, StatusQueued, StatusRunning)
	if err := row.Scan(&j.ID, &j.VideoID, &j.InputKey, &j.OutputPrefix, &j.Attempts); err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("claim next: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return &j, nil
}

func Complete(ctx context.Context, db *sql.DB, jobID string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE transcode_queue
		SET status = $1,
		    finished_at = NOW(),
		    updated_at = NOW()
		WHERE id = $2
	`, StatusDone, jobID)
	if err != nil {
		return fmt.Errorf("complete: %w", err)
	}
	return nil
}

func Fail(ctx context.Context, db *sql.DB, jobID string, message string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE transcode_queue
		SET status = $1,
		    error = $2,
		    finished_at = NOW(),
		    updated_at = NOW()
		WHERE id = $3
	`, StatusFailed, truncate(message, 2000), jobID)
	if err != nil {
		return fmt.Errorf("fail: %w", err)
	}
	return nil
}

// Enqueue inserts a new job in queued state.
func Enqueue(ctx context.Context, db *sql.DB, id string, videoID string, inputKey string, outputPrefix string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO transcode_queue (id, video_id, input_key, output_prefix, status, attempts, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 0, $6, $6)
	`, id, videoID, inputKey, outputPrefix, StatusQueued, time.Now())
	if err != nil {
		return fmt.Errorf("enqueue: %w", err)
	}
	return nil
}

func truncate(s string, n int) string {
	if n <= 0 || len(s) <= n {
		return s
	}
	return s[:n]
}

// ProcessingStatus represents the status of individual processing tasks
type ProcessingStatus string

const (
	ProcessingStatusPending    ProcessingStatus = "pending"
	ProcessingStatusProcessing ProcessingStatus = "processing"
	ProcessingStatusDone       ProcessingStatus = "done"
	ProcessingStatusFailed     ProcessingStatus = "failed"
)

// UpdateHLSStatus updates the HLS transcoding status
func UpdateHLSStatus(ctx context.Context, db *sql.DB, jobID string, status ProcessingStatus) error {
	_, err := db.ExecContext(ctx, `
		UPDATE transcode_queue
		SET hls_status = $1,
		    updated_at = NOW()
		WHERE id = $2
	`, status, jobID)
	if err != nil {
		return fmt.Errorf("update hls status: %w", err)
	}
	return nil
}

// UpdatePosterStatus updates the poster generation status
func UpdatePosterStatus(ctx context.Context, db *sql.DB, jobID string, status ProcessingStatus) error {
	_, err := db.ExecContext(ctx, `
		UPDATE transcode_queue
		SET poster_status = $1,
		    updated_at = NOW()
		WHERE id = $2
	`, status, jobID)
	if err != nil {
		return fmt.Errorf("update poster status: %w", err)
	}
	return nil
}

// UpdateScrubberPreviewStatus updates the scrubber preview (thumbnails/VTT) generation status
func UpdateScrubberPreviewStatus(ctx context.Context, db *sql.DB, jobID string, status ProcessingStatus) error {
	_, err := db.ExecContext(ctx, `
		UPDATE transcode_queue
		SET scrubber_preview_status = $1,
		    updated_at = NOW()
		WHERE id = $2
	`, status, jobID)
	if err != nil {
		return fmt.Errorf("update scrubber preview status: %w", err)
	}
	return nil
}

// UpdateHoverPreviewStatus updates the hover preview generation status
func UpdateHoverPreviewStatus(ctx context.Context, db *sql.DB, jobID string, status ProcessingStatus) error {
	_, err := db.ExecContext(ctx, `
		UPDATE transcode_queue
		SET hover_preview_status = $1,
		    updated_at = NOW()
		WHERE id = $2
	`, status, jobID)
	if err != nil {
		return fmt.Errorf("update hover preview status: %w", err)
	}
	return nil
}

// QueueStats represents statistics about the transcode queue
type QueueStats struct {
	Queued          int
	Running         int
	RunningJobs     []RunningJobInfo
	RecentCompleted int // Completed in last 5 minutes
	RecentFailed    int // Failed in last 5 minutes
}

// RunningJobInfo contains information about a running job
type RunningJobInfo struct {
	ID                    string
	VideoID               string
	StartedAt             time.Time
	HLSStatus             ProcessingStatus
	PosterStatus          ProcessingStatus
	ScrubberPreviewStatus ProcessingStatus
	HoverPreviewStatus    ProcessingStatus
}

// GetQueueStats returns current statistics about the transcode queue
func GetQueueStats(ctx context.Context, db *sql.DB) (*QueueStats, error) {
	stats := &QueueStats{}

	// Count queued jobs
	err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM transcode_queue WHERE status = $1
	`, StatusQueued).Scan(&stats.Queued)
	if err != nil {
		return nil, fmt.Errorf("count queued: %w", err)
	}

	// Count running jobs
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM transcode_queue WHERE status = $1
	`, StatusRunning).Scan(&stats.Running)
	if err != nil {
		return nil, fmt.Errorf("count running: %w", err)
	}

	// Get details of running jobs
	rows, err := db.QueryContext(ctx, `
		SELECT id, video_id, started_at, 
		       hls_status, poster_status, scrubber_preview_status, hover_preview_status
		FROM transcode_queue
		WHERE status = $1
		ORDER BY started_at ASC
	`, StatusRunning)
	if err != nil {
		return nil, fmt.Errorf("query running jobs: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var job RunningJobInfo
		err := rows.Scan(&job.ID, &job.VideoID, &job.StartedAt,
			&job.HLSStatus, &job.PosterStatus, &job.ScrubberPreviewStatus, &job.HoverPreviewStatus)
		if err != nil {
			return nil, fmt.Errorf("scan running job: %w", err)
		}
		stats.RunningJobs = append(stats.RunningJobs, job)
	}

	// Count recently completed jobs (last 5 minutes)
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM transcode_queue 
		WHERE status = $1 AND finished_at > NOW() - INTERVAL '5 minutes'
	`, StatusDone).Scan(&stats.RecentCompleted)
	if err != nil {
		return nil, fmt.Errorf("count recent completed: %w", err)
	}

	// Count recently failed jobs (last 5 minutes)
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM transcode_queue 
		WHERE status = $1 AND finished_at > NOW() - INTERVAL '5 minutes'
	`, StatusFailed).Scan(&stats.RecentFailed)
	if err != nil {
		return nil, fmt.Errorf("count recent failed: %w", err)
	}

	return stats, nil
}
