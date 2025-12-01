package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/charmbracelet/log"
)

// S3Options configures the S3Syncer.
type S3Options struct {
	Region       string
	Endpoint     string
	UsePathStyle bool
	ACL          string // e.g., "public-read"
	CacheControl string // e.g., "max-age=60"
	// Optional static credentials. If empty, default provider chain is used.
	AccessKeyID     string
	SecretAccessKey string
	SessionToken    string
}

type S3Syncer struct {
	client       *s3.Client
	uploader     *manager.Uploader
	acl          string
	cacheControl string
}

func NewS3Syncer(ctx context.Context, opts S3Options) (*S3Syncer, error) {
	lo := []func(*config.LoadOptions) error{}
	if opts.Region != "" {
		lo = append(lo, config.WithRegion(opts.Region))
	}
	if opts.AccessKeyID != "" && opts.SecretAccessKey != "" {
		lo = append(lo, config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(opts.AccessKeyID, opts.SecretAccessKey, opts.SessionToken),
		))
	}
	awsCfg, err := config.LoadDefaultConfig(ctx, lo...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if opts.UsePathStyle {
			o.UsePathStyle = true
		}
		if opts.Endpoint != "" {
			o.BaseEndpoint = aws.String(opts.Endpoint)
		}
	})
	return &S3Syncer{
		client:       client,
		uploader:     manager.NewUploader(client),
		acl:          opts.ACL,
		cacheControl: opts.CacheControl,
	}, nil
}

func (s *S3Syncer) SyncDirectory(ctx context.Context, localDir string, bucket string, prefix string) error {
	root := filepath.Clean(localDir)
	
	// Collect all files to upload
	type fileTask struct {
		localPath string
		key       string
	}
	var tasks []fileTask
	
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		key := joinKey(prefix, rel)
		tasks = append(tasks, fileTask{localPath: path, key: key})
		return nil
	})
	if err != nil {
		return err
	}
	
	if len(tasks) == 0 {
		return nil
	}
	
	log.Info("syncing directory", "files", len(tasks), "bucket", bucket, "prefix", prefix)
	
	// Upload files in parallel with concurrency limit
	const maxConcurrency = 10
	sem := make(chan struct{}, maxConcurrency)
	errChan := make(chan error, len(tasks))
	var wg sync.WaitGroup
	
	uploadedCount := 0
	skippedCount := 0
	var mu sync.Mutex
	
	for _, task := range tasks {
		wg.Add(1)
		sem <- struct{}{} // Acquire semaphore
		
		go func(t fileTask) {
			defer wg.Done()
			defer func() { <-sem }() // Release semaphore
			
			// Check if file already exists in S3
			exists, err := s.FileExists(ctx, bucket, t.key)
			if err != nil {
				errChan <- fmt.Errorf("check exists %s: %w", t.key, err)
				return
			}
			
			if exists {
				mu.Lock()
				skippedCount++
				mu.Unlock()
				return // Skip upload
			}

			log.Info("uploading file", "local_path", t.localPath, "bucket", bucket, "key", t.key)
			
			// Upload the file
			if err := s.uploadOne(ctx, t.localPath, bucket, t.key); err != nil {
				errChan <- err
				return
			}
			
			mu.Lock()
			uploadedCount++
			mu.Unlock()
		}(task)
	}
	
	// Wait for all uploads to complete
	wg.Wait()
	close(errChan)
	
	// Collect and log all errors
	var errors []error
	for err := range errChan {
		errors = append(errors, err)
		log.Error("sync error", "error", err)
	}
	
	if len(errors) > 0 {
		return fmt.Errorf("sync failed with %d errors (first: %w)", len(errors), errors[0])
	}
	
	log.Info("sync complete", "uploaded", uploadedCount, "skipped", skippedCount, "total", len(tasks))
	return nil
}

func (s *S3Syncer) UploadFile(ctx context.Context, localPath string, bucket string, key string) error {
	return s.uploadOne(ctx, localPath, bucket, key)
}

// DownloadFile downloads a file from S3 to a local path.
func (s *S3Syncer) DownloadFile(ctx context.Context, bucket string, key string, localPath string) error {
	// Create parent directory if it doesn't exist
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return fmt.Errorf("create parent dir: %w", err)
	}

	// Create the local file
	f, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("create local file %s: %w", localPath, err)
	}
	defer f.Close()

	// Download from S3
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("get object s3://%s/%s: %w", bucket, key, err)
	}
	defer result.Body.Close()

	// Copy to local file
	if _, err := io.Copy(f, result.Body); err != nil {
		return fmt.Errorf("write to %s: %w", localPath, err)
	}

	return nil
}

// FileExists checks if a file exists in S3 at the given bucket and key.
func (s *S3Syncer) FileExists(ctx context.Context, bucket string, key string) (bool, error) {
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check if it's a "not found" error
		var notFound *types.NotFound
		var noSuchKey *types.NoSuchKey
		if errors.As(err, &notFound) || errors.As(err, &noSuchKey) {
			return false, nil
		}
		return false, fmt.Errorf("head object s3://%s/%s: %w", bucket, key, err)
	}
	return true, nil
}

func (s *S3Syncer) uploadOne(ctx context.Context, localPath string, bucket string, key string) error {
	f, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("open %s: %w", localPath, err)
	}
	defer f.Close()
	ct := detectContentType(localPath)
	input := &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        io.Reader(f),
		ContentType: aws.String(ct),
	}
	if s.acl != "" {
		input.ACL = types.ObjectCannedACL(s.acl)
	}
	if s.cacheControl != "" {
		input.CacheControl = aws.String(s.cacheControl)
	}
	_, err = s.uploader.Upload(ctx, input)
	if err != nil {
		return fmt.Errorf("upload %s to s3://%s/%s: %w", localPath, bucket, key, err)
	}
	return nil
}

func joinKey(prefix, rel string) string {
	rel = strings.ReplaceAll(rel, string(filepath.Separator), "/")
	prefix = strings.Trim(prefix, "/")
	if prefix == "" {
		return rel
	}
	return prefix + "/" + rel
}

func detectContentType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".vtt":
		return "text/vtt"
	}
	if ct := mime.TypeByExtension(ext); ct != "" {
		return ct
	}
	return "application/octet-stream"
}
