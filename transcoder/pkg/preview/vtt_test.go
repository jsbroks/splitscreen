package preview

import (
	"strings"
	"testing"
)

func TestVTTBuilder_GridTimeline_FPSBased(t *testing.T) {
	b := NewVTT().
		UsingSprite("sprite.jpg").
		Grid(3, 2, 100, 56).
		AddGridTimeline(2.0, 3.0, 0) // duration=3s, fps=2 => 6 thumbs capped by 3x2
	out := b.String()
	lines := strings.Split(strings.TrimSpace(out), "\n")
	if !strings.HasPrefix(out, "WEBVTT") {
		t.Fatalf("missing WEBVTT header:\n%s", out)
	}
	// First cue should be 00:00:00.000 --> 00:00:01.000 and xywh=0,0,100,56
	wantFirst := "00:00:00.000 --> 00:00:01.000"
	if lines[2] != wantFirst {
		t.Fatalf("unexpected first cue time: %q", lines[2])
	}
	if lines[3] != "sprite.jpg#xywh=0,0,100,56" {
		t.Fatalf("unexpected first cue target: %q", lines[3])
	}
	// Last tile (i=5) should be row=1 col=2 => x=200,y=56
	if !strings.Contains(out, "sprite.jpg#xywh=200,56,100,56") {
		t.Fatalf("missing expected last tile coords in:\n%s", out)
	}
}
