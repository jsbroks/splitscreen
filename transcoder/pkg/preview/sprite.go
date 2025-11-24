package preview

import (
	"context"
	"fmt"
	"strconv"

	ff "transcoder/pkg/ffmpeg"
)

// SpriteBuilder provides a fluent API to generate a thumbnail sprite sheet via ffmpeg.
type SpriteBuilder struct {
	ffmpegPath string
	inputPath  string
	outputPath string
	cols       int
	rows       int
	thumbW     int
	fps        float64
	quality    int
	frames     int
}

func NewSprite(ffmpegPath string) *SpriteBuilder {
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg"
	}
	return &SpriteBuilder{
		ffmpegPath: ffmpegPath,
		quality:    3,
	}
}

func (b *SpriteBuilder) Input(path string) *SpriteBuilder {
	b.inputPath = path
	return b
}

func (b *SpriteBuilder) Output(path string) *SpriteBuilder {
	b.outputPath = path
	return b
}

func (b *SpriteBuilder) Grid(cols, rows int) *SpriteBuilder {
	b.cols = cols
	b.rows = rows
	return b
}

func (b *SpriteBuilder) ThumbWidth(w int) *SpriteBuilder {
	b.thumbW = w
	return b
}

func (b *SpriteBuilder) FPS(v float64) *SpriteBuilder {
	b.fps = v
	return b
}

func (b *SpriteBuilder) Quality(q int) *SpriteBuilder {
	if q > 0 {
		b.quality = q
	}
	return b
}

// Frames sets an explicit frame count to encode (useful to cap at cols*rows).
func (b *SpriteBuilder) Frames(n int) *SpriteBuilder {
	if n > 0 {
		b.frames = n
	}
	return b
}

func (b *SpriteBuilder) Run(ctx context.Context) error {
	cmd := ff.New(b.ffmpegPath).
		Overwrite(true).
		Input(b.inputPath)

	fc := ff.NewFilterChain()
	// Use fps if set; integer fps via filter, fractional appended as raw for precision
	if b.fps > 0 && float64(int(b.fps)) == b.fps {
		fc.FPS(int(b.fps))
	}
	fc.Scale(b.thumbW, -2).Tile(b.cols, b.rows)
	cmd.FilterChain(fc)
	if b.fps > 0 && float64(int(b.fps)) != b.fps {
		cmd.Filter(fmt.Sprintf("fps=%.3f", b.fps))
	}
	if b.frames > 0 {
		cmd.Arg("-frames:v", strconv.Itoa(b.frames))
	}
	cmd.Arg("-q:v", strconv.Itoa(b.quality)).
		Output(b.outputPath)

	return cmd.Run(ctx)
}


