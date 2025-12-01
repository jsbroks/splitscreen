package ffmpeg

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

type ProbeInfo struct {
	Width        int
	Height       int
	DurationSec  float64
	AvgFrameRate float64
}

func Probe(ctx context.Context, ffprobePath, inputPath string) (ProbeInfo, error) {
	if ffprobePath == "" {
		ffprobePath = "ffprobe"
	}
	args := []string{
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height,avg_frame_rate:format=duration",
		"-of", "json",
		inputPath,
	}
	cmd := exec.CommandContext(ctx, ffprobePath, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		// Include stderr output in error message for debugging
		stderr := string(out)
		if stderr != "" {
			return ProbeInfo{}, fmt.Errorf("ffprobe failed: %w (output: %s)", err, stderr)
		}
		return ProbeInfo{}, fmt.Errorf("ffprobe failed: %w", err)
	}
	var parsed struct {
		Streams []struct {
			Width        int    `json:"width"`
			Height       int    `json:"height"`
			AvgFrameRate string `json:"avg_frame_rate"`
		} `json:"streams"`
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}
	if err := json.Unmarshal(out, &parsed); err != nil {
		return ProbeInfo{}, fmt.Errorf("parse ffprobe json: %w", err)
	}
	var pi ProbeInfo
	if len(parsed.Streams) > 0 {
		pi.Width = parsed.Streams[0].Width
		pi.Height = parsed.Streams[0].Height
		pi.AvgFrameRate = parseFraction(parsed.Streams[0].AvgFrameRate)
	}
	if parsed.Format.Duration != "" {
		if d, err := strconv.ParseFloat(parsed.Format.Duration, 64); err == nil {
			pi.DurationSec = d
		}
	}
	return pi, nil
}

func parseFraction(s string) float64 {
	parts := strings.Split(s, "/")
	if len(parts) == 2 {
		num, _ := strconv.ParseFloat(parts[0], 64)
		den, _ := strconv.ParseFloat(parts[1], 64)
		if den != 0 {
			return num / den
		}
	}
	f, _ := strconv.ParseFloat(s, 64)
	return f
}
