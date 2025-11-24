package ffmpeg

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// Command provides a fluent API for building and running ffmpeg invocations.
type Command struct {
	bin    string
	args   []string
	filters []string
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

func (c *Command) buildArgs() []string {
	args := make([]string, 0, len(c.args)+2)
	args = append(args, c.args...)
	if len(c.filters) > 0 {
		joined := strings.Join(c.filters, ",")
		args = append(args, "-vf", joined)
	}
	return args
}

func (c *Command) Run(ctx context.Context) error {
	args := c.buildArgs()
	cmd := exec.CommandContext(ctx, c.bin, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg failed: %s\nargs: %s\n%s", c.bin, strings.Join(args, " "), string(out))
	}
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


