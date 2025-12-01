package ffmpeg

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/charmbracelet/log"
)

// Command provides a fluent API for building and running ffmpeg invocations.
type Command struct {
	bin              string
	args             []string
	filters          []string
	progressCallback func(percent float64, eta string, speed string)
	totalDuration    float64 // in seconds, for progress calculation
}

func New(bin string) *Command {
	if bin == "" {
		bin = "ffmpeg"
	}
	return &Command{bin: bin}
}

func (c *Command) Overwrite(enable bool) *Command {
	if enable {
		c.args = append(c.args, "-y")
	}
	return c
}

func (c *Command) Input(path string) *Command {
	c.args = append(c.args, "-i", path)
	return c
}

func (c *Command) StartAt(at time.Duration) *Command {
	if at > 0 {
		c.args = append(c.args, "-ss", fmt.Sprintf("%.3f", at.Seconds()))
	}
	return c
}

func (c *Command) Duration(d time.Duration) *Command {
	if d > 0 {
		c.args = append(c.args, "-t", fmt.Sprintf("%.3f", d.Seconds()))
	}
	return c
}

func (c *Command) VideoCodec(codec string) *Command {
	if codec != "" {
		c.args = append(c.args, "-c:v", codec)
	}
	return c
}

func (c *Command) AudioCodec(codec string) *Command {
	if codec != "" {
		c.args = append(c.args, "-c:a", codec)
	}
	return c
}

func (c *Command) Preset(preset string) *Command {
	if preset != "" {
		c.args = append(c.args, "-preset", preset)
	}
	return c
}

func (c *Command) CRF(v int) *Command {
	if v > 0 {
		c.args = append(c.args, "-crf", strconv.Itoa(v))
	}
	return c
}

func (c *Command) VideoBitrateKbps(kbps int) *Command {
	if kbps > 0 {
		k := fmt.Sprintf("%dk", kbps)
		c.args = append(c.args, "-b:v", k)
	}
	return c
}

func (c *Command) MaxrateKbps(kbps int) *Command {
	if kbps > 0 {
		c.args = append(c.args, "-maxrate", fmt.Sprintf("%dk", kbps))
	}
	return c
}

func (c *Command) BufsizeKbps(kbps int) *Command {
	if kbps > 0 {
		c.args = append(c.args, "-bufsize", fmt.Sprintf("%dk", kbps))
	}
	return c
}

func (c *Command) AudioBitrateKbps(kbps int) *Command {
	if kbps > 0 {
		c.args = append(c.args, "-b:a", fmt.Sprintf("%dk", kbps))
	}
	return c
}

func (c *Command) AudioChannels(ch int) *Command {
	if ch > 0 {
		c.args = append(c.args, "-ac", strconv.Itoa(ch))
	}
	return c
}

func (c *Command) AudioRate(hz int) *Command {
	if hz > 0 {
		c.args = append(c.args, "-ar", strconv.Itoa(hz))
	}
	return c
}

func (c *Command) GOP(g int) *Command {
	if g > 0 {
		val := strconv.Itoa(g)
		c.args = append(c.args, "-g", val, "-keyint_min", val, "-sc_threshold", "0")
	}
	return c
}

func (c *Command) NoAudio() *Command {
	c.args = append(c.args, "-an")
	return c
}

func (c *Command) Format(fmtName string) *Command {
	if fmtName != "" {
		c.args = append(c.args, "-f", fmtName)
	}
	return c
}

func (c *Command) FilterChain(fc *FilterChain) *Command {
	if fc != nil && len(fc.ops) > 0 {
		c.filters = append(c.filters, fc.String())
	}
	return c
}

func (c *Command) Filter(filter string) *Command {
	if filter != "" {
		c.filters = append(c.filters, filter)
	}
	return c
}

func (c *Command) HLS(segmentSeconds int, playlistType, flags, segmentFilename string) *Command {
	c.Format("hls")
	if segmentSeconds > 0 {
		c.args = append(c.args, "-hls_time", strconv.Itoa(segmentSeconds))
	}
	if playlistType != "" {
		c.args = append(c.args, "-hls_playlist_type", playlistType)
	}
	if flags != "" {
		c.args = append(c.args, "-hls_flags", flags)
	}
	if segmentFilename != "" {
		c.args = append(c.args, "-hls_segment_filename", segmentFilename)
	}
	return c
}

func (c *Command) Arg(args ...string) *Command {
	c.args = append(c.args, args...)
	return c
}

func (c *Command) Output(path string) *Command {
	c.args = append(c.args, path)
	return c
}

// WithProgress sets a callback for progress updates during encoding.
// durationSeconds is the total video duration for calculating progress percentage.
// The callback receives: percent (0-100), current position time, and encoding speed.
func (c *Command) WithProgress(durationSeconds float64, callback func(percent float64, position string, speed string)) *Command {
	c.totalDuration = durationSeconds
	c.progressCallback = callback
	return c
}

func (c *Command) buildArgs() []string {
	// Find the output path (last added via Output())
	// We need to insert filter args BEFORE the output path
	var outputPath string
	argsWithoutOutput := c.args

	// Check if we have args and the last one looks like an output path
	// (doesn't start with -)
	if len(c.args) > 0 && !strings.HasPrefix(c.args[len(c.args)-1], "-") {
		outputPath = c.args[len(c.args)-1]
		argsWithoutOutput = c.args[:len(c.args)-1]
	}

	args := make([]string, 0, len(c.args)+2)
	args = append(args, argsWithoutOutput...)

	// Add filters before output path
	if len(c.filters) > 0 {
		joined := strings.Join(c.filters, ",")
		args = append(args, "-vf", joined)
	}

	// Add output path last
	if outputPath != "" {
		args = append(args, outputPath)
	}

	return args
}

func (c *Command) Run(ctx context.Context) error {
	args := c.buildArgs()

	// Add progress reporting
	args = append([]string{"-progress", "pipe:2", "-stats_period", "5"}, args...)

	cmd := exec.CommandContext(ctx, c.bin, args...)

	// Capture stderr for progress monitoring
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Capture stdout for error messages
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("ffmpeg failed to start: %s\nargs: %s", c.bin, strings.Join(args, " "))
	}

	// Monitor progress in a goroutine
	progressDone := make(chan struct{})
	var stderrLines []string // Capture stderr for error reporting
	var stderrMu sync.Mutex
	go func() {
		defer close(progressDone)
		scanner := bufio.NewScanner(stderr)
		var lastTime string
		var lastSpeed string
		var lastLog time.Time
		var currentTimeMicros int64
		logInterval := 10 * time.Second

		for scanner.Scan() {
			line := scanner.Text()
			
			// Capture non-progress lines for error reporting
			if !strings.HasPrefix(line, "out_time_ms=") && 
			   !strings.HasPrefix(line, "speed=") && 
			   !strings.HasPrefix(line, "progress=") &&
			   !strings.HasPrefix(line, "total_size=") &&
			   !strings.HasPrefix(line, "bitrate=") &&
			   line != "" {
				stderrMu.Lock()
				// Keep last 20 lines to avoid memory bloat
				if len(stderrLines) >= 20 {
					stderrLines = stderrLines[1:]
				}
				stderrLines = append(stderrLines, line)
				stderrMu.Unlock()
			}

			// Parse progress lines (format: key=value)
			if strings.HasPrefix(line, "out_time_ms=") {
				// Extract timestamp in microseconds
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					microseconds, parseErr := strconv.ParseInt(parts[1], 10, 64)
					if parseErr == nil && microseconds > 0 {
						currentTimeMicros = microseconds
						// Convert to human-readable time
						seconds := microseconds / 1000000
						h := seconds / 3600
						m := (seconds % 3600) / 60
						s := seconds % 60
						lastTime = fmt.Sprintf("%02d:%02d:%02d", h, m, s)
					}
				}
			} else if strings.HasPrefix(line, "speed=") {
				// Extract speed (e.g., "1.5x")
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					lastSpeed = strings.TrimSpace(parts[1])
				}
			} else if strings.HasPrefix(line, "progress=") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 && parts[1] == "continue" && lastTime != "" {
					// Log or callback progress periodically
					now := time.Now()
					if now.Sub(lastLog) >= logInterval {
						if c.progressCallback != nil && c.totalDuration > 0 {
							// Calculate percentage based on total duration
							currentSeconds := float64(currentTimeMicros) / 1000000.0
							percent := (currentSeconds / c.totalDuration) * 100.0
							if percent > 100 {
								percent = 100
							}
							c.progressCallback(percent, lastTime, lastSpeed)
						} else {
							// Fallback to generic logging
							log.Info("ffmpeg progress", "position", lastTime, "speed", lastSpeed)
						}
						lastLog = now
					}
				}
			}
		}
	}()

	// Consume stdout to prevent blocking
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			// Just consume the output
		}
	}()

	// Wait for command to complete
	if err := cmd.Wait(); err != nil {
		<-progressDone // Wait for progress monitoring to finish
		
		// Include stderr output in error message for debugging
		stderrMu.Lock()
		errOutput := strings.Join(stderrLines, "\n")
		stderrMu.Unlock()
		
		if errOutput != "" {
			return fmt.Errorf("ffmpeg failed: %w\nstderr: %s\nargs: %s", err, errOutput, strings.Join(args, " "))
		}
		return fmt.Errorf("ffmpeg failed: %w\nargs: %s", err, strings.Join(args, " "))
	}

	<-progressDone // Wait for progress monitoring to finish
	return nil
}

// FilterChain accumulates video filter operations.
type FilterChain struct {
	ops []string
}

func NewFilterChain() *FilterChain {
	return &FilterChain{}
}

func (f *FilterChain) Scale(width, height int) *FilterChain {
	f.ops = append(f.ops, fmt.Sprintf("scale=%d:%d", width, height))
	return f
}

func (f *FilterChain) ScaleToHeight(height int) *FilterChain {
	if height > 0 {
		f.ops = append(f.ops, fmt.Sprintf("scale=-2:%d", height))
	}
	return f
}

func (f *FilterChain) FPS(fps int) *FilterChain {
	if fps > 0 {
		f.ops = append(f.ops, fmt.Sprintf("fps=%d", fps))
	}
	return f
}

func (f *FilterChain) Tile(cols, rows int) *FilterChain {
	if cols > 0 && rows > 0 {
		f.ops = append(f.ops, fmt.Sprintf("tile=%dx%d", cols, rows))
	}
	return f
}

func (f *FilterChain) String() string {
	return strings.Join(f.ops, ",")
}
