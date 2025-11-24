package storage

import "context"

// Syncer defines an abstraction for syncing transcoder outputs to object storage (e.g., S3).
// Implementations should handle creating missing prefixes and setting appropriate metadata.
type Syncer interface {
	// SyncDirectory uploads all files under localDir to s3://bucket/prefix, creating keys
	// that mirror the relative paths under localDir. Implementations may choose whether to
	// delete remote objects not present locally; callers should consult implementation docs.
	SyncDirectory(ctx context.Context, localDir string, bucket string, prefix string) error

	// UploadFile uploads a single file at localPath to s3://bucket/key.
	UploadFile(ctx context.Context, localPath string, bucket string, key string) error
}
