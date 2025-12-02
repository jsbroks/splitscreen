package transcoder

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	ff "transcoder/pkg/ffmpeg"
	hls "transcoder/pkg/hls"
	prev "transcoder/pkg/preview"

	"github.com/charmbracelet/log"
)

var _ Transcoder = (*FFmpegTranscoder)(nil)

// FFmpegTranscoder implements Transcoder by invoking ffmpeg/ffprobe binaries.
type FFmpegTranscoder struct {
	ffmpegPath            string
	ffprobePath           string
	x264Preset            string
	hlsSegSecs            int
	maxParallelRenditions int
}

func NewFFmpegTranscoder(ffmpegPath, ffprobePath string) *FFmpegTranscoder {
	return &FFmpegTranscoder{
		ffmpegPath:            defaultIfEmpty(ffmpegPath, "ffmpeg"),
		ffprobePath:           defaultIfEmpty(ffprobePath, "ffprobe"),
		x264Preset:            "veryfast",
		hlsSegSecs:            4,
		maxParallelRenditions: 2, // Default to 2 parallel renditions
	}
}

// SetMaxParallelRenditions configures the maximum number of renditions to encode in parallel
func (t *FFmpegTranscoder) SetMaxParallelRenditions(max int) {
	if max > 0 {
		t.maxParallelRenditions = max
	}
}

func (t *FFmpegTranscoder) ProbeVideo(ctx context.Context, inputPath string) (VideoInfo, error) {
	info, err := ff.Probe(ctx, t.ffprobePath, inputPath)
	if err != nil {
		return VideoInfo{}, err
	}
	return VideoInfo{
		Width:        info.Width,
		Height:       info.Height,
		DurationSec:  info.DurationSec,
		AvgFrameRate: info.AvgFrameRate,
	}, nil
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

	var wg sync.WaitGroup
	var mu sync.Mutex
	errChan := make(chan error, len(ladder))

	// Semaphore to limit parallel renditions
	renditionSem := make(chan struct{}, t.maxParallelRenditions)

	for _, r := range ladder {
		wg.Add(1)
		renditionSem <- struct{}{} // Acquire semaphore
		go func(r Rendition) {
			defer wg.Done()
			defer func() { <-renditionSem }() // Release semaphore

			// Log start of rendition processing
			log.Info("starting HLS rendition",
				"height", r.Height,
				"bitrate_kbps", r.VideoBitrateKbps,
				"crf", r.CRF,
			)

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

			// Add progress callback if we have duration info
			if srcInfo.DurationSec > 0 {
				cmd.WithProgress(srcInfo.DurationSec, func(percent float64, position string, speed string) {
					log.Info("HLS rendition progress",
						"height", r.Height,
						"percent", fmt.Sprintf("%.1f%%", percent),
						"position", position,
						"speed", speed,
					)
				})
			}

			if err := cmd.Run(ctx); err != nil {
				log.Error("HLS rendition failed",
					"height", r.Height,
					"error", err,
				)
				errChan <- fmt.Errorf("ffmpeg HLS %dp: %w", r.Height, err)
				return
			}
			log.Info("HLS rendition complete", "height", r.Height)
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

			// Protect shared master playlist builder with mutex
			mu.Lock()
			mb.AddVariant(playlist, hls.StreamInfAttr{
				Bandwidth:   bandwidth * 1000,
				ResolutionW: max(width, 0),
				ResolutionH: r.Height,
				FrameRate:   float64(max(frameRate, 0)),
			})
			mu.Unlock()
		}(r)
	}

	// Wait for all renditions to complete
	wg.Wait()
	close(errChan)

	// Check for any errors
	if err := <-errChan; err != nil {
		return err
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

func (t *FFmpegTranscoder) GenerateThumbnailsAndVTT(ctx context.Context, inputPath, outDir, vttPath string, thumbHeight int, maxThumbnails int) error {
	startTime := time.Now()

	if thumbHeight <= 0 {
		thumbHeight = 100 // Default height
	}
	if maxThumbnails <= 0 {
		maxThumbnails = 100 // Default max thumbnails
	}

	// Create output directory for thumbnails
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("create thumbnails dir: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(vttPath), 0o755); err != nil {
		return fmt.Errorf("create vtt dir: %w", err)
	}

	// Probe video to get duration and dimensions
	// Add debugging info about the file
	fileInfo, statErr := os.Stat(inputPath)
	if statErr != nil {
		log.Error("failed to stat input file before probe", 
			"file", inputPath,
			"error", statErr,
		)
		return fmt.Errorf("stat input file: %w", statErr)
	}
	
	log.Info("probing video for thumbnails", 
		"file", filepath.Base(inputPath),
		"full_path", inputPath,
		"size_bytes", fileInfo.Size(),
	)
	
	info, err := ff.Probe(ctx, t.ffprobePath, inputPath)
	if err != nil {
		log.Error("ffprobe failed for thumbnails",
			"file", inputPath,
			"size_bytes", fileInfo.Size(),
			"error", err,
		)
		return fmt.Errorf("probe: %w", err)
	}

	// Determine number of thumbnails based on video duration
	// Aim for reasonable coverage without generating too many
	numThumbs := min(int(math.Ceil(info.DurationSec)), maxThumbnails)
	if numThumbs == 0 {
		numThumbs = 1
	}

	// Calculate interval based on number of thumbnails
	intervalSec := info.DurationSec / float64(numThumbs)
	if intervalSec <= 0 {
		intervalSec = 1.0
	}

	// Calculate thumbnail width based on height and video aspect ratio
	thumbWidth := thumbHeight
	if info.Width > 0 && info.Height > 0 {
		aspectRatio := float64(info.Width) / float64(info.Height)
		thumbWidth = roundEven(int(float64(thumbHeight) * aspectRatio))
	}

	log.Info("generating thumbnails",
		"count", numThumbs,
		"size", fmt.Sprintf("%dx%d", thumbWidth, thumbHeight),
		"interval_sec", fmt.Sprintf("%.1f", intervalSec),
		"duration_sec", fmt.Sprintf("%.1f", info.DurationSec),
	)

	// Generate individual thumbnail images
	lastLogTime := time.Now()
	for i := 0; i < numThumbs; i++ {
		timestamp := float64(i) * intervalSec
		if timestamp >= info.DurationSec {
			break
		}

		thumbFilename := fmt.Sprintf("thumb-%05d.jpg", i)
		thumbPath := filepath.Join(outDir, thumbFilename)

		// Use GeneratePoster method to create each thumbnail
		if err := t.GeneratePoster(ctx, inputPath, thumbPath, time.Duration(timestamp*float64(time.Second)), thumbWidth); err != nil {
			return fmt.Errorf("generate thumbnail %d: %w", i, err)
		}

		// Log progress every 10 thumbnails or every 5 seconds
		if (i+1)%10 == 0 || time.Since(lastLogTime) >= 5*time.Second {
			percent := float64(i+1) / float64(numThumbs) * 100
			log.Info("thumbnail generation progress",
				"completed", i+1,
				"total", numThumbs,
				"percent", fmt.Sprintf("%.1f%%", percent),
				"elapsed", time.Since(startTime).Truncate(time.Millisecond),
			)
			lastLogTime = time.Now()
		}
	}

	log.Info("all thumbnails generated",
		"count", numThumbs,
		"duration", time.Since(startTime).Truncate(time.Millisecond),
	)

	// Generate VTT file
	log.Info("writing VTT file", "file", filepath.Base(vttPath))
	vttContent := "WEBVTT\n\n"
	thumbsDirName := filepath.Base(outDir)

	for i := 0; i < numThumbs; i++ {
		startTimeVtt := float64(i) * intervalSec
		endTime := startTimeVtt + intervalSec
		if endTime > info.DurationSec {
			endTime = info.DurationSec
		}
		if startTimeVtt >= info.DurationSec {
			break
		}

		thumbFilename := fmt.Sprintf("thumb-%05d.jpg", i)
		thumbReference := fmt.Sprintf("%s/%s", thumbsDirName, thumbFilename)

		vttContent += fmt.Sprintf("%s --> %s\n%s\n\n",
			formatVTTTimestamp(startTimeVtt),
			formatVTTTimestamp(endTime),
			thumbReference,
		)
	}

	if err := os.WriteFile(vttPath, []byte(vttContent), 0o644); err != nil {
		return fmt.Errorf("write vtt: %w", err)
	}

	log.Info("thumbnail generation complete",
		"total_time", time.Since(startTime).Truncate(time.Millisecond),
	)
	return nil
}

func formatVTTTimestamp(seconds float64) string {
	h := int(seconds) / 3600
	m := (int(seconds) % 3600) / 60
	s := seconds - float64(h*3600+m*60)
	return fmt.Sprintf("%02d:%02d:%06.3f", h, m, s)
}

// Legacy sprite-based method kept for compatibility - can be removed if not used elsewhere
func (t *FFmpegTranscoder) GenerateVTT(ctx context.Context, inputPath, spritePath, vttPath string, cols, rows, thumbWidth int, fps float64) error {
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
		log.Error("ffprobe failed for sprite generation",
			"file", inputPath,
			"error", err,
		)
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
		duration = 5 * time.Second
	}
	if fps <= 0 {
		fps = 24
	}
	if width <= 0 {
		width = 480
	}

	// Probe video to get total duration
	info, err := ff.Probe(ctx, t.ffprobePath, inputPath)
	if err != nil {
		log.Error("ffprobe failed for hover preview",
			"file", inputPath,
			"error", err,
		)
		return fmt.Errorf("probe: %w", err)
	}

	// Calculate timestamps at 25%, 50%, and 75% of video duration
	clipDurationSec := duration.Seconds()
	
	log.Info("calculating hover preview timestamps",
		"video_duration_sec", info.DurationSec,
		"clip_duration_sec", clipDurationSec,
	)
	
	timestamps := []float64{
		info.DurationSec * 0.25,
		info.DurationSec * 0.50,
		info.DurationSec * 0.75,
	}

	// Ensure clips don't exceed video duration
	var adjustments []string
	for i, ts := range timestamps {
		original := ts
		if ts+clipDurationSec > info.DurationSec {
			timestamps[i] = math.Max(0, info.DurationSec-clipDurationSec)
			adjustments = append(adjustments, 
				fmt.Sprintf("clip%d: %.3f->%.3f (would exceed duration)", i, original, timestamps[i]))
		}
	}
	
	if len(adjustments) > 0 {
		log.Warn("adjusted hover preview timestamps", "adjustments", strings.Join(adjustments, "; "))
	}
	
	log.Info("hover preview timestamps finalized",
		"clip0_start", timestamps[0],
		"clip1_start", timestamps[1],
		"clip2_start", timestamps[2],
	)

	if outWebM != "" {
		if err := os.MkdirAll(filepath.Dir(outWebM), 0o755); err != nil {
			return fmt.Errorf("webm dir: %w", err)
		}
		if err := t.generateHoverPreviewWebM(ctx, inputPath, outWebM, timestamps, clipDurationSec, width, fps); err != nil {
			return err
		}
	}

	if outMP4 != "" {
		if err := os.MkdirAll(filepath.Dir(outMP4), 0o755); err != nil {
			return fmt.Errorf("mp4 dir: %w", err)
		}
		if err := t.generateHoverPreviewMP4(ctx, inputPath, outMP4, timestamps, clipDurationSec, width, fps); err != nil {
			return err
		}
	}

	return nil
}

func (t *FFmpegTranscoder) generateHoverPreviewWebM(ctx context.Context, inputPath, outPath string, timestamps []float64, clipDurationSec float64, width int, fps int) error {
	log.Info("generating hover preview WebM", "width", width, "fps", fps)

	// Build complex filter to extract and concatenate clips
	// [0:v] split=3 [v0][v1][v2];
	// [v0] trim=start=T1:duration=D, setpts=PTS-STARTPTS, scale=W:-2, fps=FPS [clip0];
	// [v1] trim=start=T2:duration=D, setpts=PTS-STARTPTS, scale=W:-2, fps=FPS [clip1];
	// [v2] trim=start=T3:duration=D, setpts=PTS-STARTPTS, scale=W:-2, fps=FPS [clip2];
	// [clip0][clip1][clip2] concat=n=3:v=1:a=0 [out]

	filterComplex := fmt.Sprintf(
		"[0:v] split=3 [v0][v1][v2]; "+
			"[v0] trim=start=%.3f:duration=%.3f, setpts=PTS-STARTPTS, scale=%d:-2, fps=%d [clip0]; "+
			"[v1] trim=start=%.3f:duration=%.3f, setpts=PTS-STARTPTS, scale=%d:-2, fps=%d [clip1]; "+
			"[v2] trim=start=%.3f:duration=%.3f, setpts=PTS-STARTPTS, scale=%d:-2, fps=%d [clip2]; "+
			"[clip0][clip1][clip2] concat=n=3:v=1:a=0 [out]",
		timestamps[0], clipDurationSec, width, fps,
		timestamps[1], clipDurationSec, width, fps,
		timestamps[2], clipDurationSec, width, fps,
	)

	cmd := ff.New(t.ffmpegPath).
		Overwrite(true).
		Input(inputPath).
		Arg("-filter_complex", filterComplex).
		Arg("-map", "[out]").
		NoAudio().
		VideoCodec("libvpx-vp9").
		Arg("-b:v", "0").
		CRF(32).
		Arg("-row-mt", "1").
		Output(outPath)

	// Add progress callback (total duration is 3 clips)
	totalDuration := clipDurationSec * 3
	cmd.WithProgress(totalDuration, func(percent float64, position string, speed string) {
		log.Info("hover preview WebM progress",
			"percent", fmt.Sprintf("%.1f%%", percent),
			"position", position,
			"speed", speed,
		)
	})

	if err := cmd.Run(ctx); err != nil {
		return fmt.Errorf("ffmpeg webm: %w", err)
	}

	log.Info("hover preview WebM complete")
	return nil
}

func (t *FFmpegTranscoder) generateHoverPreviewMP4(ctx context.Context, inputPath, outPath string, timestamps []float64, clipDurationSec float64, width int, fps int) error {
	log.Info("generating hover preview MP4", "width", width, "fps", fps)

	// Build complex filter to extract and concatenate clips
	filterComplex := fmt.Sprintf(
		"[0:v] split=3 [v0][v1][v2]; "+
			"[v0] trim=start=%.3f:duration=%.3f, setpts=PTS-STARTPTS, scale=%d:-2, fps=%d [clip0]; "+
			"[v1] trim=start=%.3f:duration=%.3f, setpts=PTS-STARTPTS, scale=%d:-2, fps=%d [clip1]; "+
			"[v2] trim=start=%.3f:duration=%.3f, setpts=PTS-STARTPTS, scale=%d:-2, fps=%d [clip2]; "+
			"[clip0][clip1][clip2] concat=n=3:v=1:a=0 [out]",
		timestamps[0], clipDurationSec, width, fps,
		timestamps[1], clipDurationSec, width, fps,
		timestamps[2], clipDurationSec, width, fps,
	)

	cmd := ff.New(t.ffmpegPath).
		Overwrite(true).
		Input(inputPath).
		Arg("-filter_complex", filterComplex).
		Arg("-map", "[out]").
		NoAudio().
		VideoCodec("libx264").
		Preset(t.x264Preset).
		CRF(28).
		Arg("-movflags", "+faststart").
		Output(outPath)

	// Add progress callback (total duration is 3 clips)
	totalDuration := clipDurationSec * 3
	cmd.WithProgress(totalDuration, func(percent float64, position string, speed string) {
		log.Info("hover preview MP4 progress",
			"percent", fmt.Sprintf("%.1f%%", percent),
			"position", position,
			"speed", speed,
		)
	})

	if err := cmd.Run(ctx); err != nil {
		return fmt.Errorf("ffmpeg mp4: %w", err)
	}

	log.Info("hover preview MP4 complete")
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

