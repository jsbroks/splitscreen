package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// VideoStatus represents the status of a video in the system.
type VideoStatus string

const (
	VideoStatusUploaded   VideoStatus = "uploaded"
	VideoStatusProcessing VideoStatus = "processing"
	VideoStatusInReview   VideoStatus = "in_review"
	VideoStatusApproved   VideoStatus = "approved"
	VideoStatusRejected   VideoStatus = "rejected"
	VideoStatusFailed     VideoStatus = "failed"
)

// UpdateVideoStatus updates the status of a video by its ID.
func UpdateVideoStatus(ctx context.Context, db *sql.DB, videoID string, status VideoStatus) error {
	query := `
		UPDATE video
		SET status = $1, updated_at = $2
		WHERE id = $3
	`
	
	result, err := db.ExecContext(ctx, query, status, time.Now(), videoID)
	if err != nil {
		return fmt.Errorf("update video status: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("video not found: %s", videoID)
	}
	
	return nil
}

// SetVideoProcessing marks a video as being processed.
func SetVideoProcessing(ctx context.Context, db *sql.DB, videoID string) error {
	return UpdateVideoStatus(ctx, db, videoID, VideoStatusProcessing)
}

// SetVideoApproved marks a video as approved and ready for viewing.
func SetVideoApproved(ctx context.Context, db *sql.DB, videoID string) error {
	return UpdateVideoStatus(ctx, db, videoID, VideoStatusApproved)
}

// SetVideoFailed marks a video as failed processing.
func SetVideoFailed(ctx context.Context, db *sql.DB, videoID string) error {
	return UpdateVideoStatus(ctx, db, videoID, VideoStatusFailed)
}

// SetVideoInReview marks a video as ready for review.
func SetVideoInReview(ctx context.Context, db *sql.DB, videoID string) error {
	return UpdateVideoStatus(ctx, db, videoID, VideoStatusInReview)
}

// UpdateVideoMetadata updates the video's duration and size after processing.
func UpdateVideoMetadata(ctx context.Context, db *sql.DB, videoID string, durationSeconds int, sizeBytes int64) error {
	query := `
		UPDATE video
		SET duration_seconds = $1, size_bytes = $2, updated_at = $3
		WHERE id = $4
	`
	
	result, err := db.ExecContext(ctx, query, durationSeconds, sizeBytes, time.Now(), videoID)
	if err != nil {
		return fmt.Errorf("update video metadata: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("video not found: %s", videoID)
	}
	
	return nil
}

// GetVideoStatus retrieves the current status of a video.
func GetVideoStatus(ctx context.Context, db *sql.DB, videoID string) (VideoStatus, error) {
	query := `SELECT status FROM video WHERE id = $1`
	
	var status string
	err := db.QueryRowContext(ctx, query, videoID).Scan(&status)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("video not found: %s", videoID)
		}
		return "", fmt.Errorf("get video status: %w", err)
	}
	
	return VideoStatus(status), nil
}

