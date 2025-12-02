#!/usr/bin/env python3
"""
Download video sources from a given URL.
Extracts page title and all video source URLs.
Optionally uploads the selected video to the platform.
"""

import argparse
import json
import os
import sys
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# Enable readline for better input editing (arrow keys, etc.)
try:
    import readline
except ImportError:
    # readline not available on Windows, but input() still works
    pass

# Import VideoUploader from upload_video.py
try:
    from upload_video import VideoUploader
except ImportError:
    VideoUploader = None


def get_video_sources(url: str, headless: bool = True, timeout: int = 60) -> dict:
    """
    Fetch a URL and extract the page title and all video sources.
    Uses Playwright to render the page with a real browser.
    
    Args:
        url: The URL to fetch and parse
        
    Returns:
        Dictionary containing 'title' and 'sources' (list of video URLs)
    """
    try:
        with sync_playwright() as p:
            # Launch browser with additional args to appear more like a real browser
            browser = p.chromium.launch(
                headless=headless,
                args=[
                    '--disable-blink-features=AutomationControlled',
                ]
            )
            
            # Create context with realistic settings
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='America/New_York',
            )
            
            # Add extra properties to make it less detectable
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)
            
            page = context.new_page()
            
            print(f"Loading page: {url}", file=sys.stderr)
            
            try:
                # Navigate to the page with a more lenient wait condition
                page.goto(url, wait_until='domcontentloaded', timeout=timeout * 1000)
                
                # Wait a bit for any dynamic content to load
                print("Waiting for content to load...", file=sys.stderr)
                page.wait_for_timeout(3000)
                
            except Exception as e:
                print(f"Warning during page load: {e}", file=sys.stderr)
                print("Continuing with partial content...", file=sys.stderr)
            
            # Get the page title and clean it
            title = page.title().strip()
            
            # Get the page content
            content = page.content()
            
            # Close browser
            browser.close()
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find all video sources
        sources = []
        
        # Method 1: Find all <video> tags with src attribute
        for video in soup.find_all('video'):
            if video.get('src'):
                full_url = urljoin(url, video['src'])
                sources.append(full_url)
            
            # Also check for <source> tags within <video>
            for source in video.find_all('source'):
                if source.get('src'):
                    full_url = urljoin(url, source['src'])
                    sources.append(full_url)
        
        # Method 2: Find standalone <source> tags (might be outside video tags in some cases)
        for source in soup.find_all('source'):
            if source.get('src') and source.get('type', '').startswith('video'):
                full_url = urljoin(url, source['src'])
                if full_url not in sources:
                    sources.append(full_url)
        
        return {
            'title': title,
            'sources': list(set(sources))  # Remove duplicates
        }
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def select_video_url(sources: list[str]) -> Optional[str]:
    """
    Prompt user to select a video URL from the list.
    
    Args:
        sources: List of video URLs
        
    Returns:
        Selected video URL or None if cancelled
    """
    if not sources:
        return None
    
    if len(sources) == 1:
        print(f"\nFound 1 video source:")
        print(f"  {sources[0]}")
        response = input("\nUse this video? (Y/n): ").strip().lower()
        if response in ('', 'y', 'yes'):
            return sources[0]
        return None
    
    # Multiple sources
    print(f"\nFound {len(sources)} video sources:")
    for i, source in enumerate(sources, 1):
        print(f"  {i}. {source}")
    
    while True:
        response = input(f"\nSelect video (1-{len(sources)}, or 'q' to quit): ").strip()
        
        if response.lower() in ('q', 'quit', 'cancel'):
            return None
        
        try:
            idx = int(response)
            if 1 <= idx <= len(sources):
                return sources[idx - 1]
            else:
                print(f"Please enter a number between 1 and {len(sources)}")
        except ValueError:
            print("Please enter a valid number")


def prompt_title(prefill_text: Optional[str] = None) -> str:
    """
    Prompt user for a title, optionally pre-filling with existing text.
    
    Args:
        prefill_text: Optional text to pre-fill the input with
        
    Returns:
        The entered or edited title
    """
    if prefill_text:
        # Clean the prefill text
        prefill_text = prefill_text.strip()
        
        print(f"\nOriginal title: {prefill_text}")
        print("Edit title below (press Enter to accept, use arrow keys to navigate):")
        
        # Set up readline to pre-fill the input with the original title
        if 'readline' in sys.modules:
            def prefill_input():
                readline.insert_text(prefill_text)
                readline.redisplay()
            readline.set_pre_input_hook(prefill_input)
        
        try:
            response = input("> ").strip()
        finally:
            # Clear the pre-input hook
            if 'readline' in sys.modules:
                readline.set_pre_input_hook()
        
        # Return the edited title if provided, otherwise keep original
        if response:
            return response
        return prefill_text
    else:
        # No prefill - just prompt for new title
        print("\nEnter video title:")
        while True:
            response = input("> ").strip()
            if response:
                return response
            print("Title cannot be empty. Please enter a title:")


def get_tags() -> list[str]:
    """
    Prompt user to enter tags.
    
    Returns:
        List of tags (trimmed and cleaned)
    """
    print("\nEnter tags (comma-separated, or press Enter to skip):")
    response = input("Tags: ").strip()
    
    if not response:
        return []
    
    # Split by comma, trim each tag, and remove empty strings
    tags = [tag.strip() for tag in response.split(',')]
    tags = [tag for tag in tags if tag]  # Remove empty strings
    
    return tags


def main():
    parser = argparse.ArgumentParser(
        description='Extract video sources from a web page using a real browser (Playwright). Optionally upload the selected video to the platform.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode - select video from webpage, edit title, add tags
  python download.py https://example.com/video-page
  
  # Direct video URL mode - skip webpage scraping, just prompt for title/tags
  python download.py --video-url https://example.com/video.mp4
  
  # Direct video URL with upload
  python download.py --video-url https://example.com/video.mp4 --upload
  
  # Interactive mode with upload
  python download.py https://example.com/video-page --upload
  
  # Non-interactive mode (just list videos)
  python download.py https://example.com/video-page --non-interactive
  
  # With custom timeout and visible browser
  python download.py https://example.com/video-page --no-headless --timeout 120
  
  # Full workflow with upload and metadata
  python download.py https://example.com/video-page \\
    --upload \\
    --description "Video description" \\
    --thumbnail https://example.com/thumb.jpg \\
    --view-count 5000 \\
    --external-ref "site:12345"

Environment Variables:
  API_KEY           - API key for authentication (required for --upload)
  USER_ID           - User ID for uploads (required for --upload)
  API_BASE_URL      - API base URL (default: http://localhost:3000)
        """
    )
    parser.add_argument(
        'url',
        nargs='?',
        help='URL of the page to download videos from (optional if using --video-url)'
    )
    parser.add_argument(
        '--video-url',
        help='Direct video URL (skips webpage scraping, prompts for title and tags)'
    )
    parser.add_argument(
        '--headless',
        action='store_true',
        default=True,
        help='Run browser in headless mode (default: True)'
    )
    parser.add_argument(
        '--no-headless',
        dest='headless',
        action='store_false',
        help='Run browser in non-headless mode (show browser window)'
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=60,
        help='Page load timeout in seconds (default: 60)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON (implies non-interactive mode)'
    )
    parser.add_argument(
        '--non-interactive',
        action='store_true',
        help='Skip interactive prompts and just display all video sources'
    )
    
    # Upload options
    parser.add_argument(
        '--upload',
        action='store_true',
        help='Upload the selected video to the platform after selection'
    )
    parser.add_argument(
        '--api-key',
        default="XQkhZPEVXQ0LgJLr",
        help='API key for authentication (or set API_KEY env var, required for upload)'
    )
    parser.add_argument(
        '--user-id',
        default="CBjRk4napZz5z4kZNVKA7V26tHX7tChy",
        help='User ID of the uploader (or set USER_ID env var, required for upload)'
    )
    parser.add_argument(
        '--api-url',
        default=os.getenv("API_BASE_URL", "https://splithaven.com"),
        help='API base URL (default: https://splithaven.com or API_BASE_URL env var)'
    )
    parser.add_argument(
        '--description',
        help='Video description (for upload)'
    )
    parser.add_argument(
        '--thumbnail',
        help='Path to thumbnail image or URL (for upload)'
    )
    parser.add_argument(
        '--view-count',
        type=int,
        help='Initial view count (for upload, useful for imports)'
    )
    parser.add_argument(
        '--external-ref',
        help='External reference ID to prevent duplicates (for upload)'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.url and not args.video_url:
        parser.error("Either URL or --video-url must be provided")
    
    # Initialize variables
    final_title = None
    selected_url = None
    tags = []
    
    # Handle direct video URL (skip webpage scraping)
    if args.video_url:
        print("\n" + "=" * 80)
        print("DIRECT VIDEO URL MODE")
        print("=" * 80)
        print(f"Video URL: {args.video_url}")
        
        # Prompt for title and tags
        final_title = prompt_title()
        tags = get_tags()
        selected_url = args.video_url
        
    else:
        # Get video sources from webpage
        result = get_video_sources(args.url, headless=args.headless, timeout=args.timeout)
    
        # Non-interactive or JSON mode
        if args.json or args.non_interactive:
            if args.json:
                output = {
                    'title': result['title'],
                    'sources': result['sources'],
                    'url': args.url
                }
                print(json.dumps(output, indent=2))
            else:
                print("\n" + "=" * 80)
                print(f"Page Title: {result['title']}")
                print(f"Found {len(result['sources'])} video source(s)")
                print("=" * 80)
                
                if result['sources']:
                    for i, source in enumerate(result['sources'], 1):
                        print(f"{i}. {source}")
                else:
                    print("\nNo video sources found on this page.")
            return
        
        # Interactive mode
        print("\n" + "=" * 80)
        print(f"Page Title: {result['title']}")
        print(f"Found {len(result['sources'])} video source(s)")
        print("=" * 80)
        
        if not result['sources']:
            print("\n⚠️  No video sources found on this page.")
            print("You can manually enter a video URL to continue.")
            
            manual_url = input("\nEnter video URL (or press Enter to quit): ").strip()
            
            if not manual_url:
                print("Cancelled.")
                return
            
            # Use the manually entered URL
            selected_url = manual_url
            final_title = prompt_title(result['title'])
            tags = get_tags()
        else:
            # Interactive selection
            selected_url = select_video_url(result['sources'])
            
            if not selected_url:
                print("\nCancelled.")
                return
            
            # Edit title
            final_title = prompt_title(result['title']).strip()
            
            # Get tags
            tags = get_tags()
    
    # Print final summary (for both direct URL and webpage scraping modes)
    if final_title and selected_url:
        print("\n" + "=" * 80)
        print("FINAL SELECTION")
        print("=" * 80)
        print(f"Title: {final_title}")
        print(f"Video URL: {selected_url}")
        
        if tags:
            print(f"Tags: {', '.join(tags)}")
        else:
            print("Tags: (none)")
        
        print("=" * 80)
        
        # Also output as JSON for easy parsing
        output = {
            'title': final_title,
            'video_url': selected_url,
            'tags': tags,
            'original_url': args.url or args.video_url
        }
        print("\nJSON Output:")
        print(json.dumps(output, indent=2))
    
    # Upload if requested
    if args.upload:
        if not final_title or not selected_url:
            print("\n❌ Error: Cannot upload - no video selected")
            sys.exit(1)
        
        if VideoUploader is None:
            print("\n❌ Error: upload_video module not found. Make sure upload_video.py is in the same directory.")
            sys.exit(1)
        
        print("\n" + "=" * 80)
        print("UPLOADING VIDEO")
        print("=" * 80)
        
        # Get API key and user ID
        api_key = args.api_key or os.getenv("API_KEY")
        user_id = args.user_id or os.getenv("USER_ID")
        
        if not api_key:
            print("❌ Error: API key is required for upload")
            print("Provide via --api-key argument or API_KEY environment variable")
            sys.exit(1)
        
        if not user_id:
            print("❌ Error: User ID is required for upload")
            print("Provide via --user-id argument or USER_ID environment variable")
            sys.exit(1)
        
        # Use original URL as external reference if not provided
        external_ref = args.external_ref or args.url or args.video_url
        
        try:
            uploader = VideoUploader(base_url=args.api_url, api_key=api_key)
            
            print(f"\n📤 Uploading video...")
            print(f"   Title: {final_title}")
            print(f"   Video URL: {selected_url}")
            if tags:
                print(f"   Tags: {', '.join(tags)}")
            if args.thumbnail:
                print(f"   Thumbnail: {args.thumbnail}")
            if args.description:
                print(f"   Description: {args.description}")
            if external_ref:
                print(f"   External ref: {external_ref}")
            print()
            
            result = uploader.upload_video(
                video_path=selected_url,
                title=final_title,
                user_id=user_id,
                description=args.description,
                thumbnail_path=args.thumbnail,
                tags=tags if tags else None,
                view_count=args.view_count,
                external_reference=external_ref,
            )
            
            print(f"\n✅ Upload successful!")
            print(f"   Video ID: {result['videoId']}")
            print(f"   S3 Bucket: {result['bucket']}")
            print(f"   S3 Key: {result['key']}")
            
        except Exception as e:
            print(f"\n❌ Upload failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == '__main__':
    main()

