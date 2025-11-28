package transcoder

import (
	"context"
	"time"
)

// Rendition defines a single HLS output variant.
type Rendition struct {
	Height           int // 240, 360, 480, 720, 1080
	VideoBitrateKbps int // optional target; use with CRF if desired
	AudioBitrateKbps int // e.g. 96/128
	FPS              int // 24/30; can be 0 to keep source
	KeyframeInterval int // in frames (e.g., 48 for 24fps, ~2s)
	CRF              int // e.g., 21–28; lower = higher quality
}

type VideoInfo struct {
	Width        int
	Height       int
	DurationSec  float64
	AvgFrameRate float64
}

type Transcoder interface {
	// ProbeVideo returns information about the source video
	ProbeVideo(ctx context.Context, inputPath string) (VideoInfo, error)
	// TranscodeHLS writes variant playlists/segments into outDir following the ladder.
	TranscodeHLS(ctx context.Context, inputPath, outDir string, ladder []Rendition) error
	// GeneratePoster captures a single frame thumbnail at the given offset.
	GeneratePoster(ctx context.Context, inputPath, outPath string, at time.Duration, width int) error
	// GenerateThumbnailsAndVTT creates individual thumbnail images and a WebVTT file for scrubber previews.
	// It automatically determines the interval based on video duration and calculates width from height.
	GenerateThumbnailsAndVTT(ctx context.Context, inputPath, outDir, vttPath string, thumbHeight int, maxThumbnails int) error
	// GenerateHoverPreview creates a short muted teaser video in WebM/MP4.
	GenerateHoverPreview(ctx context.Context, inputPath, outWebM, outMP4 string, duration time.Duration, width int, fps int) error
}
