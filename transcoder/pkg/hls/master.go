package hls

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// StreamInfAttr holds attributes for EXT-X-STREAM-INF line in a master playlist.
type StreamInfAttr struct {
	Bandwidth        int     // bits per second (required by spec)
	AverageBandwidth int     // optional, bits per second
	ResolutionW      int     // e.g., 1280
	ResolutionH      int     // e.g., 720
	FrameRate        float64 // e.g., 29.97
	Codecs           string  // e.g., "avc1.64001f,mp4a.40.2"
	Audio            string  // GROUP-ID for associated audio Renditions
	Subtitles        string  // GROUP-ID for associated subtitles Renditions
	ClosedCaptions   string  // "NONE" or GROUP-ID
}

// MasterBuilder is a fluent builder for HLS master playlists.
type MasterBuilder struct {
	version  int
	variants []variant
}

type variant struct {
	uri   string
	attrs StreamInfAttr
}

func NewMaster() *MasterBuilder {
	return &MasterBuilder{version: 3}
}

func (b *MasterBuilder) Version(v int) *MasterBuilder {
	if v > 0 {
		b.version = v
	}
	return b
}

func (b *MasterBuilder) AddVariant(uri string, attrs StreamInfAttr) *MasterBuilder {
	b.variants = append(b.variants, variant{uri: uri, attrs: attrs})
	return b
}

func (b *MasterBuilder) String() string {
	var lines []string
	lines = append(lines, "#EXTM3U")
	lines = append(lines, fmt.Sprintf("#EXT-X-VERSION:%d", b.version))
	for _, v := range b.variants {
		lines = append(lines, "#EXT-X-STREAM-INF:"+formatStreamInfAttrs(v.attrs))
		lines = append(lines, v.uri)
	}
	return strings.Join(lines, "\n") + "\n"
}

func (b *MasterBuilder) WriteFile(path string) error {
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

func formatStreamInfAttrs(a StreamInfAttr) string {
	parts := []string{}
	if a.Bandwidth > 0 {
		parts = append(parts, "BANDWIDTH="+strconv.Itoa(a.Bandwidth))
	}
	if a.AverageBandwidth > 0 {
		parts = append(parts, "AVERAGE-BANDWIDTH="+strconv.Itoa(a.AverageBandwidth))
	}
	if a.ResolutionW > 0 && a.ResolutionH > 0 {
		parts = append(parts, fmt.Sprintf("RESOLUTION=%dx%d", a.ResolutionW, a.ResolutionH))
	}
	if a.FrameRate > 0 {
		parts = append(parts, "FRAME-RATE="+trimFloat(a.FrameRate, 3))
	}
	if a.Codecs != "" {
		parts = append(parts, `CODECS="`+a.Codecs+`"`)
	}
	if a.Audio != "" {
		parts = append(parts, `AUDIO="`+a.Audio+`"`)
	}
	if a.Subtitles != "" {
		parts = append(parts, `SUBTITLES="`+a.Subtitles+`"`)
	}
	if a.ClosedCaptions != "" {
		parts = append(parts, `CLOSED-CAPTIONS="`+a.ClosedCaptions+`"`)
	}
	return strings.Join(parts, ",")
}

func trimFloat(v float64, prec int) string {
	// Format with precision then trim trailing zeros and possible dot.
	s := strconv.FormatFloat(v, 'f', prec, 64)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	if s == "" {
		return "0"
	}
	return s
}
