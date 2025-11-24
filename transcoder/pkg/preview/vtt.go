package preview

import (
	"fmt"
	"os"
	"strings"
)

// VTTBuilder builds a WebVTT file that references regions within a sprite image.
type VTTBuilder struct {
	lines          []string
	spriteBasename string
	cols           int
	rows           int
	thumbW         int
	thumbH         int
}

func NewVTT() *VTTBuilder {
	b := &VTTBuilder{}
	b.lines = append(b.lines, "WEBVTT", "")
	return b
}

// UsingSprite sets the sprite file basename used in cue URLs (e.g., "sprite.jpg").
func (b *VTTBuilder) UsingSprite(basename string) *VTTBuilder {
	b.spriteBasename = basename
	return b
}

func (b *VTTBuilder) Grid(cols, rows, thumbW, thumbH int) *VTTBuilder {
	b.cols = cols
	b.rows = rows
	b.thumbW = thumbW
	b.thumbH = thumbH
	return b
}

// AddGridTimeline generates cues for a grid of thumbnails:
// - If fps > 0 and durationSec > 0, uses ceil(duration*fps) thumbs, capped to cols*rows
// - Else uses totalThumbs if provided (>0), capped to cols*rows
// Each cue spans [start, end] where end = start + max(1s, 1/fps) if fps>0 else 1s.
func (b *VTTBuilder) AddGridTimeline(fps float64, durationSec float64, totalThumbs int) *VTTBuilder {
	maxThumbs := b.cols * b.rows
	n := 0
	if fps > 0 && durationSec > 0 {
		n = int(ceil(durationSec * fps))
	}
	if n == 0 && totalThumbs > 0 {
		n = totalThumbs
	}
	if n == 0 {
		n = maxThumbs
	}
	if n > maxThumbs {
		n = maxThumbs
	}
	for i := 0; i < n; i++ {
		start := 0.0
		if fps > 0 {
			start = float64(i) / fps
		} else if durationSec > 0 {
			start = (durationSec * float64(i)) / float64(n)
		}
		end := start + maxf(1.0, invOrZero(fps))
		x := (i % b.cols) * b.thumbW
		y := (i / b.cols) * b.thumbH
		b.lines = append(b.lines,
			fmt.Sprintf("%s --> %s", formatVTTTime(start), formatVTTTime(end)),
			fmt.Sprintf("%s#xywh=%d,%d,%d,%d", b.spriteBasename, x, y, b.thumbW, b.thumbH),
			"",
		)
	}
	return b
}

func (b *VTTBuilder) String() string {
	return strings.Join(b.lines, "\n") + "\n"
}

func (b *VTTBuilder) WriteFile(path string) error {
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

func formatVTTTime(sec float64) string {
	if sec < 0 {
		sec = 0
	}
	h := int(sec) / 3600
	m := (int(sec) % 3600) / 60
	s := sec - float64(h*3600+m*60)
	return fmt.Sprintf("%02d:%02d:%06.3f", h, m, s)
}

func invOrZero(v float64) float64 {
	if v <= 0 {
		return 0
	}
	return 1.0 / v
}

func maxf(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func ceil(v float64) float64 {
	i := int(v)
	if float64(i) == v {
		return v
	}
	return float64(i + 1)
}
