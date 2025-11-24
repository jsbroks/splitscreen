package storage

import (
	"context"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
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
	return filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
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
		return s.uploadOne(ctx, path, bucket, key)
	})
}

func (s *S3Syncer) UploadFile(ctx context.Context, localPath string, bucket string, key string) error {
	return s.uploadOne(ctx, localPath, bucket, key)
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
