package hls

import (
	"strings"
	"testing"
)

func TestMasterBuilder_AddVariantAndString(t *testing.T) {
	mb := NewMaster().Version(3)
	mb.AddVariant("v720.m3u8", StreamInfAttr{
		Bandwidth:   2500000,
		ResolutionW: 1280,
		ResolutionH: 720,
		FrameRate:   30,
	})
	mb.AddVariant("v480.m3u8", StreamInfAttr{
		Bandwidth:   1200000,
		ResolutionW: 854,
		ResolutionH: 480,
		FrameRate:   30,
	})
	out := mb.String()
	if !strings.HasPrefix(out, "#EXTM3U\n#EXT-X-VERSION:3\n") {
		t.Fatalf("unexpected header:\n%s", out)
	}
	if !strings.Contains(out, "#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,FRAME-RATE=30\nv720.m3u8") {
		t.Errorf("missing 720p variant in:\n%s", out)
	}
	if !strings.Contains(out, "#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=854x480,FRAME-RATE=30\nv480.m3u8") {
		t.Errorf("missing 480p variant in:\n%s", out)
	}
	if !strings.HasSuffix(out, "\n") {
		t.Errorf("output should end with newline")
	}
}
