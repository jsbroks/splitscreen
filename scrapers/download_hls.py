#!/usr/bin/env python3
"""
Download HLS (m3u8) streams and convert to MP4.

This script downloads the highest quality stream from an HLS playlist
and saves it as an MP4 file using ffmpeg.

Requirements:
    - ffmpeg installed (brew install ffmpeg)
    - requests library (pip install requests)

Usage:
    python download_hls.py URL OUTPUT.mp4
    python download_hls.py https://example.com/video.m3u8 video.mp4
"""

import argparse
import subprocess
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests


def check_ffmpeg():
    """Check if ffmpeg is installed."""
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def parse_m3u8(url: str) -> dict:
    """
    Parse m3u8 playlist and return information about available streams.
    
    Args:
        url: URL to the m3u8 playlist
        
    Returns:
        dict: Information about the playlist including available streams
    """
    response = requests.get(url)
    response.raise_for_status()
    
    content = response.text
    lines = content.strip().split("\n")
    
    # Check if this is a master playlist (contains multiple quality options)
    is_master_playlist = any("#EXT-X-STREAM-INF" in line for line in lines)
    
    if not is_master_playlist:
        # This is a media playlist, use it directly
        return {
            "type": "media",
            "url": url,
            "bandwidth": None,
        }
    
    # Parse master playlist to find streams
    streams = []
    base_url = url.rsplit("/", 1)[0] + "/"
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        if line.startswith("#EXT-X-STREAM-INF"):
            # Parse stream info
            stream_info = {}
            
            # Extract bandwidth
            if "BANDWIDTH=" in line:
                bandwidth_str = line.split("BANDWIDTH=")[1].split(",")[0]
                stream_info["bandwidth"] = int(bandwidth_str)
            
            # Extract resolution if available
            if "RESOLUTION=" in line:
                resolution_str = line.split("RESOLUTION=")[1].split(",")[0]
                stream_info["resolution"] = resolution_str
            
            # Next line should be the stream URL
            if i + 1 < len(lines):
                stream_url = lines[i + 1].strip()
                if not stream_url.startswith("#"):
                    # Make absolute URL
                    if not stream_url.startswith("http"):
                        stream_url = urljoin(base_url, stream_url)
                    stream_info["url"] = stream_url
                    streams.append(stream_info)
        
        i += 1
    
    # Sort by bandwidth (highest first)
    streams.sort(key=lambda x: x.get("bandwidth", 0), reverse=True)
    
    return {
        "type": "master",
        "streams": streams,
        "best_stream": streams[0] if streams else None,
    }


def download_hls(m3u8_url: str, output_file: str, quality: str = "best") -> bool:
    """
    Download HLS stream and save as MP4.
    
    Args:
        m3u8_url: URL to the m3u8 playlist
        output_file: Output MP4 filename
        quality: Quality to download ("best", "worst", or specific bandwidth)
        
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"🔍 Analyzing playlist: {m3u8_url}")
    
    # Parse the m3u8 playlist
    try:
        playlist_info = parse_m3u8(m3u8_url)
    except Exception as e:
        print(f"❌ Error parsing playlist: {e}")
        return False
    
    # Determine which stream to download
    if playlist_info["type"] == "media":
        stream_url = playlist_info["url"]
        print(f"📺 Found media playlist (single quality)")
    else:
        streams = playlist_info["streams"]
        if not streams:
            print("❌ No streams found in playlist")
            return False
        
        print(f"\n📺 Found {len(streams)} quality options:")
        for i, stream in enumerate(streams, 1):
            resolution = stream.get("resolution", "unknown")
            bandwidth = stream.get("bandwidth", 0)
            bandwidth_mbps = bandwidth / 1_000_000
            print(f"   {i}. {resolution} ({bandwidth_mbps:.2f} Mbps)")
        
        # Select stream based on quality preference
        if quality == "best":
            selected_stream = streams[0]
        elif quality == "worst":
            selected_stream = streams[-1]
        else:
            # Try to find stream with matching bandwidth
            selected_stream = streams[0]  # Default to best
        
        stream_url = selected_stream["url"]
        resolution = selected_stream.get("resolution", "unknown")
        bandwidth = selected_stream.get("bandwidth", 0)
        bandwidth_mbps = bandwidth / 1_000_000
        
        print(f"\n✅ Selected: {resolution} ({bandwidth_mbps:.2f} Mbps)")
    
    # Download using ffmpeg
    print(f"\n⬇️  Downloading to: {output_file}")
    print("This may take a while depending on the video size...")
    
    # Ensure output directory exists
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    
    # Build ffmpeg command
    cmd = [
        "ffmpeg",
        "-i", stream_url,
        "-c", "copy",  # Copy streams without re-encoding
        "-bsf:a", "aac_adtstoasc",  # Fix AAC bitstream
        "-y",  # Overwrite output file
        output_file,
    ]
    
    try:
        # Run ffmpeg with progress output
        result = subprocess.run(
            cmd,
            check=True,
            stderr=subprocess.PIPE,
            text=True,
        )
        
        print(f"\n✅ Download complete!")
        print(f"📁 Saved to: {output_file}")
        
        # Get file size
        file_size = Path(output_file).stat().st_size
        file_size_mb = file_size / (1024 * 1024)
        print(f"📊 File size: {file_size_mb:.2f} MB")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ ffmpeg error:")
        print(e.stderr)
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Download HLS (m3u8) streams and convert to MP4",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download highest quality
  python download_hls.py https://example.com/video.m3u8 output.mp4
  
  # Download to specific directory
  python download_hls.py https://example.com/video.m3u8 videos/output.mp4
  
  # Download lowest quality (smallest file size)
  python download_hls.py https://example.com/video.m3u8 output.mp4 --quality worst

Requirements:
  - ffmpeg must be installed: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)
  - requests library: pip install requests
        """,
    )
    
    parser.add_argument(
        "m3u8_url",
        help="URL to the m3u8 playlist",
    )
    parser.add_argument(
        "output",
        help="Output MP4 filename",
    )
    parser.add_argument(
        "--quality",
        "-q",
        choices=["best", "worst"],
        default="best",
        help="Quality to download (default: best)",
    )
    
    args = parser.parse_args()
    
    # Check if ffmpeg is installed
    if not check_ffmpeg():
        print("❌ Error: ffmpeg is not installed")
        print("\nInstall ffmpeg:")
        print("  macOS: brew install ffmpeg")
        print("  Ubuntu/Debian: sudo apt-get install ffmpeg")
        print("  Windows: Download from https://ffmpeg.org/download.html")
        sys.exit(1)
    
    # Validate output filename
    if not args.output.endswith(".mp4"):
        print("⚠️  Warning: Output file doesn't have .mp4 extension")
        print(f"Output will be saved as: {args.output}")
    
    # Download the stream
    success = download_hls(args.m3u8_url, args.output, args.quality)
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

