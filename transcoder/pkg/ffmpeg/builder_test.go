package ffmpeg

import "testing"

func TestFilterChain_String(t *testing.T) {
	fc := NewFilterChain().
		ScaleToHeight(720).
		FPS(30).
		Tile(3, 2)
	got := fc.String()
	want := "scale=-2:720,fps=30,tile=3x2"
	if got != want {
		t.Fatalf("unexpected filter chain: got %q want %q", got, want)
	}
}
