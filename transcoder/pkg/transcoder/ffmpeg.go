package transcoder

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"time"
	ff "transcoder/pkg/ffmpeg"
	hls "transcoder/pkg/hls"
	prev "transcoder/pkg/preview"
)

// FFmpegTranscoder implements Transcoder by invoking ffmpeg/ffprobe binaries.
type FFmpegTranscoder struct {
	ffmpegPath  string
	ffprobePath string
	x264Preset  string
	hlsSegSecs  int
}

func NewFFmpegTranscoder(ffmpegPath, ffprobePath string) *FFmpegTranscoder {
	return &FFmpegTranscoder{
		ffmpegPath:  defaultIfEmpty(ffmpegPath, "ffmpeg"),
		ffprobePath: defaultIfEmpty(ffprobePath, "ffprobe"),
		x264Preset:  "veryfast",
		hlsSegSecs:  4,
	}
}

func (t *FFmpegTranscoder) TranscodeHLS(ctx context.Context, inputPath, outDir string, ladder []Rendition) error {
	if len(ladder) == 0 {
		return errors.New("ladder must contain at least one rendition")
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("create out dir: %w", err)
	}
	srcInfo, _ := ff.Probe(ctx, t.ffprobePath, inputPath)
	mb := hls.NewMaster().Version(3)
	for _, r := range ladder {
		playlist := fmt.Sprintf("v%d.m3u8", r.Height)
		segmentPattern := fmt.Sprintf("v%d_%%04d.ts", r.Height)
		cmd := ff.New(t.ffmpegPath).Overwrite(true).Input(inputPath)
		fc := ff.NewFilterChain()
		if r.Height > 0 {
			fc.ScaleToHeight(r.Height)
		}
		if r.FPS > 0 {
			fc.FPS(r.FPS)
		}
		cmd.FilterChain(fc)
		cmd.VideoCodec("libx264").Preset(t.x264Preset).CRF(r.CRF)
        
		if r.VideoBitrateKbps > 0 {
			cmd.VideoBitrateKbps(r.VideoBitrateKbps).
				MaxrateKbps(r.VideoBitrateKbps).
				BufsizeKbps(r.VideoBitrateKbps * 2)
		}
		g := r.KeyframeInterval
		if g <= 0 {
			// default to ~2s GOP based on FPS when available
			fps := r.FPS
			if fps <= 0 && srcInfo.AvgFrameRate > 0 {
				fps = int(math.Round(srcInfo.AvgFrameRate))
			}
			if fps <= 0 {
				fps = 24
			}
			g = fps * 2
		}
		cmd.GOP(g)
		ab := r.AudioBitrateKbps
		if ab <= 0 {
			ab = 128
		}
		cmd.AudioCodec("aac").AudioBitrateKbps(ab).AudioChannels(2).AudioRate(48000)
		cmd.HLS(t.hlsSegSecs, "vod", "independent_segments", filepath.Join(outDir, segmentPattern)).
			Output(filepath.Join(outDir, playlist))
		if err := cmd.Run(ctx); err != nil {
			return fmt.Errorf("ffmpeg HLS %dp: %w", r.Height, err)
		}
		bandwidth := r.VideoBitrateKbps
		if bandwidth <= 0 {
			bandwidth = estimateBitrateForHeight(r.Height)
		}
		bandwidth += ab
		width := 0
		if srcInfo.Width > 0 && srcInfo.Height > 0 && r.Height > 0 {
			width = roundEven(int(float64(r.Height) * float64(srcInfo.Width) / float64(srcInfo.Height)))
		}
		frameRate := r.FPS
		if frameRate <= 0 {
			frameRate = int(math.Round(srcInfo.AvgFrameRate))
		}
		mb.AddVariant(playlist, hls.StreamInfAttr{
			Bandwidth:   bandwidth * 1000,
			ResolutionW: max(width, 0),
			ResolutionH: r.Height,
			FrameRate:   float64(max(frameRate, 0)),
		})
	}
	if err := mb.WriteFile(filepath.Join(outDir, "master.m3u8")); err != nil {
		return fmt.Errorf("write master playlist: %w", err)
	}
	return nil
}

func (t *FFmpegTranscoder) GeneratePoster(ctx context.Context, inputPath, outPath string, at time.Duration, width int) error {
	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		return fmt.Errorf("create poster dir: %w", err)
	}
	fc := ff.NewFilterChain().Scale(width, -2)
	cmd := ff.New(t.ffmpegPath).
		Overwrite(true).
		StartAt(at).
		Input(inputPath).
		Arg("-vframes", "1").
		FilterChain(fc).
		Arg("-q:v", "2").
		Output(outPath)
	if err := cmd.Run(ctx); err != nil {
		return fmt.Errorf("ffmpeg poster: %w", err)
	}
	return nil
}

func (t *FFmpegTranscoder) GenerateSpriteAndVTT(ctx context.Context, inputPath, spritePath, vttPath string, cols, rows, thumbWidth int, fps float64) error {
	if cols <= 0 || rows <= 0 {
		return errors.New("cols and rows must be > 0")
	}
	if thumbWidth <= 0 {
		return errors.New("thumbWidth must be > 0")
	}
	if fps < 0 {
		return errors.New("fps must be >= 0")
	}
	if err := os.MkdirAll(filepath.Dir(spritePath), 0o755); err != nil {
		return fmt.Errorf("sprite dir: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(vttPath), 0o755); err != nil {
		return fmt.Errorf("vtt dir: %w", err)
	}
	info, err := ff.Probe(ctx, t.ffprobePath, inputPath)
	if err != nil {
		return fmt.Errorf("probe: %w", err)
	}
	scaledH := 0
	if info.Width > 0 && info.Height > 0 {
		scaledH = roundEven(int(float64(thumbWidth) * float64(info.Height) / float64(info.Width)))
	}
	maxThumbs := cols * rows
	var numFrames int
	if fps > 0 && info.DurationSec > 0 {
		numFrames = int(math.Ceil(info.DurationSec * fps))
	}
	if numFrames == 0 {
		numFrames = maxThumbs
	}
	if numFrames > maxThumbs {
		numFrames = maxThumbs
	}
	if err := prev.NewSprite(t.ffmpegPath).
		Input(inputPath).
		Grid(cols, rows).
		ThumbWidth(thumbWidth).
		FPS(fps).
		Frames(numFrames).
		Quality(3).
		Output(spritePath).
		Run(ctx); err != nil {
		return fmt.Errorf("ffmpeg sprite: %w", err)
	}
	// Build VTT mapping each sampled frame to its cell in the single sprite sheet.
	var totalThumbs int
	if fps > 0 && info.DurationSec > 0 {
		totalThumbs = int(math.Ceil(info.DurationSec * fps))
	}
	if totalThumbs == 0 {
		totalThumbs = numFrames
	}
	if totalThumbs > maxThumbs {
		totalThumbs = maxThumbs
	}
	if err := prev.NewVTT().
		UsingSprite(filepath.Base(spritePath)).
		Grid(cols, rows, thumbWidth, max(scaledH, 0)).
		AddGridTimeline(fps, info.DurationSec, totalThumbs).
		WriteFile(vttPath); err != nil {
		return fmt.Errorf("write vtt: %w", err)
	}
	return nil
}

func (t *FFmpegTranscoder) GenerateHoverPreview(ctx context.Context, inputPath, outWebM, outMP4 string, duration time.Duration, width int, fps int) error {
	if duration <= 0 {
		duration = 3 * time.Second
	}
	if fps <= 0 {
		fps = 24
	}
	if width <= 0 {
		width = 480
	}
	if outWebM != "" {
		if err := os.MkdirAll(filepath.Dir(outWebM), 0o755); err != nil {
			return fmt.Errorf("webm dir: %w", err)
		}
		fc := ff.NewFilterChain().Scale(width, -2).FPS(fps)
		cmd := ff.New(t.ffmpegPath).
			Overwrite(true).
			Input(inputPath).
			Duration(duration).
			FilterChain(fc).
			NoAudio().
			VideoCodec("libvpx-vp9").
			Arg("-b:v", "0").
			CRF(32).
			Arg("-row-mt", "1").
			Output(outWebM)
		if err := cmd.Run(ctx); err != nil {
			return fmt.Errorf("ffmpeg webm: %w", err)
		}
	}
	if outMP4 != "" {
		if err := os.MkdirAll(filepath.Dir(outMP4), 0o755); err != nil {
			return fmt.Errorf("mp4 dir: %w", err)
		}
		fc := ff.NewFilterChain().Scale(width, -2).FPS(fps)
		cmd := ff.New(t.ffmpegPath).
			Overwrite(true).
			Input(inputPath).
			Duration(duration).
			FilterChain(fc).
			NoAudio().
			VideoCodec("libx264").
			Preset(t.x264Preset).
			CRF(28).
			Arg("-movflags", "+faststart").
			Output(outMP4)
		if err := cmd.Run(ctx); err != nil {
			return fmt.Errorf("ffmpeg mp4: %w", err)
		}
	}
	return nil
}

func estimateBitrateForHeight(h int) int {
	switch {
	case h <= 240:
		return 400
	case h <= 360:
		return 800
	case h <= 480:
		return 1200
	case h <= 720:
		return 2500
	default:
		return 5000
	}
}

func roundEven(v int) int {
	if v%2 == 0 {
		return v
	}
	return v + 1
}

func max[T ~int | ~float64](a, b T) T {
	if a > b {
		return a
	}
	return b
}

func defaultIfEmpty(s, def string) string {
	if s == "" {
		return def
	}
	return s
}