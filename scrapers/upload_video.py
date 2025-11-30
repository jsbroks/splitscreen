#!/usr/bin/env python3
"""
Example script for uploading videos to the API endpoint.

This script uses API Key authentication for programmatic access.

Features:
- Upload videos from local files or URLs
- Upload thumbnails from local files or URLs
- Automatic download and cleanup of temporary files for URLs
- Support for external references to prevent duplicates
- Support for custom view counts
- Support for custom created timestamps
- Support for creator associations with roles

Requirements:
    pip install requests
"""

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests


class VideoUploader:
    """Client for uploading videos to the video platform API."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
    ):
        """
        Initialize the video uploader.

        Args:
            base_url: The base URL of the API (e.g., "http://localhost:3000")
            api_key: API key for authentication (required)
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self._creator_cache: dict[str, str] = {}  # username -> creator_id mapping

    def upsert_creator(
        self,
        username: str,
        display_name: str,
        aliases: Optional[list[str]] = None,
        image: Optional[str] = None,
        birthday: Optional[str] = None,
        links: Optional[list[str]] = None,
    ) -> dict:
        """
        Create or update a creator.

        Args:
            username: Unique username for the creator
            display_name: Display name for the creator
            aliases: Optional list of alternative names
            image: Optional image URL
            birthday: Optional birthday in YYYY-MM-DD format
            links: Optional list of social media/website links

        Returns:
            dict: Response containing creator data with id
        """
        # Check cache first
        if username in self._creator_cache:
            return {"creator": {"id": self._creator_cache[username]}}

        url = f"{self.base_url}/api/v1/creators"

        payload = {
            "username": username,
            "displayName": display_name,
        }

        if aliases:
            payload["aliases"] = aliases
        if image:
            payload["image"] = image
        if birthday:
            payload["birthday"] = birthday
        if links:
            payload["links"] = links

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()

        result = response.json()
        creator_id = result["creator"]["id"]
        
        # Cache the creator ID
        self._creator_cache[username] = creator_id
        
        return result

    def ensure_creators(
        self,
        creators: list[dict],
    ) -> list[dict[str, str]]:
        """
        Ensure all creators exist, creating them if necessary.
        
        Accepts creators in two formats:
        1. Simple format: {"id": "creator_id", "role": "performer"}
        2. Full format: {"username": "...", "display_name": "...", "role": "performer", ...}
        
        Args:
            creators: List of creator dicts
            
        Returns:
            list: List of creators in simple format with valid IDs
        """
        if not creators:
            return []
        
        result_creators = []
        
        for creator in creators:
            role = creator.get("role", "performer")
            
            # Check if this is already a simple format with just ID
            if "id" in creator and "username" not in creator:
                # Already has an ID, assume it exists
                result_creators.append({
                    "id": creator["id"],
                    "role": role,
                })
            else:
                # Full format - need to upsert the creator
                username = creator.get("username")
                display_name = creator.get("display_name") or creator.get("displayName") or username
                
                if not username:
                    raise ValueError(f"Creator must have 'username' or 'id': {creator}")
                
                print(f"   Ensuring creator exists: {username}")
                
                upsert_result = self.upsert_creator(
                    username=username,
                    display_name=display_name,
                    aliases=creator.get("aliases"),
                    image=creator.get("image"),
                    birthday=creator.get("birthday"),
                    links=creator.get("links"),
                )
                
                creator_id = upsert_result["creator"]["id"]
                action = upsert_result.get("action", "found")
                print(f"   Creator {action}: {username} (ID: {creator_id})")
                
                result_creators.append({
                    "id": creator_id,
                    "role": role,
                })
        
        return result_creators

    def create_video(
        self,
        title: str,
        user_id: str,
        filename: str,
        description: Optional[str] = None,
        content_type: Optional[str] = None,
        thumbnail_filename: Optional[str] = None,
        thumbnail_content_type: Optional[str] = None,
        creators: Optional[list[dict[str, str]]] = None,
        tags: Optional[list[str]] = None,
        view_count: Optional[int] = None,
        external_reference: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> dict:
        """
        Create a video upload and get signed URLs.

        Args:
            title: Video title
            user_id: User ID of the uploader (required)
            filename: Video filename (e.g., "video.mp4")
            description: Optional video description
            content_type: Optional content type (e.g., "video/mp4")
            thumbnail_filename: Optional thumbnail filename
            thumbnail_content_type: Optional thumbnail content type
            creators: Optional list of creator dicts with 'id' and 'role' keys
                     Example: [{"id": "creator123", "role": "performer"}]
                     Valid roles: "performer", "producer"
            tags: Optional list of tag strings
            view_count: Optional initial view count (for imports)
            external_reference: Optional external reference ID to prevent duplicates
            created_at: Optional creation datetime (for imports)

        Returns:
            dict: Response containing videoId, uploadUrl, etc.
        
        Raises:
            requests.HTTPError: If the request fails (409 if external reference exists)
        """
        url = f"{self.base_url}/api/v1/upload"

        # Prepare request payload
        payload = {
            "title": title,
            "userId": user_id,
            "filename": filename,
        }

        if description:
            payload["description"] = description
        if content_type:
            payload["contentType"] = content_type
        if thumbnail_filename:
            payload["thumbnailFilename"] = thumbnail_filename
        if thumbnail_content_type:
            payload["thumbnailContentType"] = thumbnail_content_type
        if creators:
            payload["creators"] = creators
        if tags:
            payload["tags"] = tags
        if view_count is not None:
            payload["viewCount"] = view_count
        if external_reference:
            payload["externalReference"] = external_reference
        if created_at:
            # Convert datetime to ISO format string
            payload["createdAt"] = created_at.isoformat()

        # Prepare headers with API key
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

        # Make request
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()

        return response.json()

    def upload_file_to_s3(self, upload_url: str, file_path: str, content_type: str):
        """
        Upload a file to S3 using the signed URL.

        Args:
            upload_url: The signed S3 URL
            file_path: Path to the file to upload
            content_type: Content type of the file
        """
        with open(file_path, "rb") as f:
            response = requests.put(
                upload_url,
                data=f,
                headers={"Content-Type": content_type},
            )
            response.raise_for_status()

    def upload_video(
        self,
        video_path: str,
        title: str,
        user_id: str,
        description: Optional[str] = None,
        thumbnail_path: Optional[str] = None,
        creators: Optional[list[dict[str, str]]] = None,
        tags: Optional[list[str]] = None,
        view_count: Optional[int] = None,
        external_reference: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> dict:
        """
        Complete video upload workflow: create video and upload files.

        Args:
            video_path: Path to video file or URL
            title: Video title
            user_id: User ID of the uploader (required)
            description: Optional video description
            thumbnail_path: Optional path to thumbnail image or URL
            creators: Optional list of creator dicts with 'id' and 'role' keys
                     Example: [{"id": "creator123", "role": "performer"}]
                     Valid roles: "performer", "producer"
            tags: Optional list of tag strings
            view_count: Optional initial view count (for imports)
            external_reference: Optional external reference ID to prevent duplicates
            created_at: Optional creation datetime (for imports)

        Returns:
            dict: Response containing videoId and other details
        
        Raises:
            requests.HTTPError: If the request fails (409 if external reference exists)
        """
        temp_video_path = None
        temp_thumbnail_path = None

        try:
            # Handle video path (local file or URL)
            if self._is_url(video_path):
                # Extract file extension from URL
                parsed_url = urlparse(video_path)
                path_suffix = Path(parsed_url.path).suffix or ".mp4"
                temp_video_path = self._download_file(video_path, suffix=path_suffix)
                actual_video_path = temp_video_path
            else:
                actual_video_path = video_path
                video_file = Path(actual_video_path)
                if not video_file.exists():
                    raise FileNotFoundError(f"Video file not found: {video_path}")

            video_file = Path(actual_video_path)
            content_type = self._get_content_type(video_file)

            # Check video file size
            video_size = video_file.stat().st_size
            if video_size < 1024:  # Less than 1KB
                size_bytes = video_size
                raise ValueError(
                    f"Video file is too small ({size_bytes} bytes). "
                    f"Minimum size is 1KB. File may be corrupted or incomplete."
                )
            
            # Log file size for debugging
            video_size_mb = video_size / (1024 * 1024)
            print(f"Video file size: {video_size_mb:.2f} MB")

            # Handle thumbnail path (local file or URL)
            thumbnail_filename = None
            thumbnail_content_type = None
            actual_thumbnail_path = None
            
            if thumbnail_path:
                if self._is_url(thumbnail_path):
                    # Extract file extension from URL
                    parsed_url = urlparse(thumbnail_path)
                    path_suffix = Path(parsed_url.path).suffix or ".jpg"
                    temp_thumbnail_path = self._download_file(thumbnail_path, suffix=path_suffix)
                    actual_thumbnail_path = temp_thumbnail_path
                else:
                    actual_thumbnail_path = thumbnail_path
                    thumb_file = Path(actual_thumbnail_path)
                    if not thumb_file.exists():
                        raise FileNotFoundError(f"Thumbnail file not found: {thumbnail_path}")
                
                thumb_file = Path(actual_thumbnail_path)
                
                # Check thumbnail file size
                thumb_size = thumb_file.stat().st_size
                if thumb_size < 100:  # Less than 100 bytes
                    print(f"⚠️  Warning: Thumbnail is very small ({thumb_size} bytes), may be corrupted")
                
                thumbnail_filename = thumb_file.name
                thumbnail_content_type = self._get_content_type(thumb_file)

            # Ensure creators exist before creating video
            if creators:
                print(f"Checking creators...")
                creators = self.ensure_creators(creators)

            # Create video and get upload URLs
            print(f"Creating video upload for: {title}")
            response = self.create_video(
                title=title,
                user_id=user_id,
                filename=video_file.name,
                description=description,
                content_type=content_type,
                thumbnail_filename=thumbnail_filename,
                thumbnail_content_type=thumbnail_content_type,
                creators=creators,
                tags=tags,
                view_count=view_count,
                external_reference=external_reference,
                created_at=created_at,
            )

            video_id = response["videoId"]
            print(f"Video created with ID: {video_id}")

            # Upload video file
            print(f"Uploading video file: {actual_video_path}")
            self.upload_file_to_s3(response["uploadUrl"], actual_video_path, content_type)
            print("Video file uploaded successfully")

            # Upload thumbnail if provided
            if actual_thumbnail_path and response.get("thumbnailUploadUrl"):
                print(f"Uploading thumbnail: {actual_thumbnail_path}")
                self.upload_file_to_s3(
                    response["thumbnailUploadUrl"],
                    actual_thumbnail_path,
                    thumbnail_content_type or "image/jpeg",
                )
                print("Thumbnail uploaded successfully")

            return response

        finally:
            # Clean up temporary files
            if temp_video_path and os.path.exists(temp_video_path):
                print(f"Cleaning up temporary video file: {temp_video_path}")
                os.unlink(temp_video_path)
            if temp_thumbnail_path and os.path.exists(temp_thumbnail_path):
                print(f"Cleaning up temporary thumbnail file: {temp_thumbnail_path}")
                os.unlink(temp_thumbnail_path)

    @staticmethod
    def _is_url(path: str) -> bool:
        """Check if a path is a URL."""
        try:
            result = urlparse(path)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    @staticmethod
    def _download_file(url: str, suffix: Optional[str] = None) -> str:
        """
        Download a file from a URL to a temporary location.

        Args:
            url: The URL to download from
            suffix: Optional file suffix/extension (e.g., ".mp4")

        Returns:
            str: Path to the downloaded temporary file
        """
        print(f"Downloading file from URL: {url}")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        
        # Download the file in chunks
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        chunk_size = 8192
        
        with temp_file:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    temp_file.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        print(f"\rDownload progress: {progress:.1f}%", end="", flush=True)
        
        if total_size > 0:
            print()  # New line after progress
        print(f"Downloaded to temporary file: {temp_file.name}")
        return temp_file.name

    @staticmethod
    def _get_content_type(file_path: Path) -> str:
        """Get content type based on file extension."""
        extension = file_path.suffix.lower()
        content_types = {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".webm": "video/webm",
            ".mkv": "video/x-matroska",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        return content_types.get(extension, "application/octet-stream")


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Upload videos to the video platform API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Upload from JSON file
  python upload_video.py --json video_data.json

  # Basic upload with args
  python upload_video.py --video video.mp4 --title "My Video" --user-id user123

  # Upload with all options
  python upload_video.py \\
    --video https://example.com/video.mp4 \\
    --title "Imported Video" \\
    --user-id user123 \\
    --description "Video description" \\
    --thumbnail https://example.com/thumb.jpg \\
    --tags music dance \\
    --view-count 5000 \\
    --external-ref "external:12345" \\
    --creators '{"id":"creator1","role":"performer"}' \\
    --creators '{"id":"creator2","role":"producer"}'

JSON File Format:
  {
    "video": "path/to/video.mp4",
    "title": "My Video",
    "user_id": "user123",
    "description": "Optional description",
    "thumbnail": "path/to/thumb.jpg",
    "tags": ["tag1", "tag2"],
    "creators": [
      {"id": "existing_creator_id", "role": "performer"},
      {"username": "new_creator", "display_name": "Creator Name", "role": "producer"}
    ],
    "view_count": 1000,
    "external_reference": "external:12345",
    "created_at": "2024-01-15T10:30:00"
  }

Creator Formats:
  - Simple (existing): {"id": "creator_id", "role": "performer"}
  - Full (auto-create): {"username": "name", "display_name": "Display", "role": "performer"}

Environment Variables (used as fallbacks):
  API_KEY           - API key for authentication
  USER_ID           - Default user ID if not specified
  API_BASE_URL      - API base URL (default: http://localhost:3000)
        """,
    )

    # JSON file input
    parser.add_argument(
        "--json",
        "-j",
        help="Path to JSON file containing video upload data",
    )

    # Required arguments (unless using --json)
    parser.add_argument(
        "--video",
        "-v",
        help="Path to video file or URL (required unless using --json)",
    )
    parser.add_argument(
        "--title",
        "-t",
        help="Video title (required unless using --json)",
    )

    # API configuration
    parser.add_argument(
        "--api-key",
        help="API key for authentication (or set API_KEY env var)",
    )
    parser.add_argument(
        "--user-id",
        "-u",
        help="User ID of the uploader (or set USER_ID env var)",
    )
    parser.add_argument(
        "--api-url",
        default=os.getenv("API_BASE_URL", "http://localhost:3000"),
        help="API base URL (default: http://localhost:3000 or API_BASE_URL env var)",
    )

    # Optional video metadata
    parser.add_argument(
        "--description",
        "-d",
        help="Video description",
    )
    parser.add_argument(
        "--thumbnail",
        help="Path to thumbnail image or URL",
    )
    parser.add_argument(
        "--tags",
        nargs="+",
        help="Video tags (space-separated)",
    )
    parser.add_argument(
        "--creators",
        action="append",
        help='Creator JSON: {"id":"creator_id","role":"performer|producer"} (can be used multiple times)',
    )
    parser.add_argument(
        "--view-count",
        type=int,
        help="Initial view count (useful for imports)",
    )
    parser.add_argument(
        "--external-ref",
        help="External reference ID to prevent duplicates",
    )
    parser.add_argument(
        "--created-at",
        help="Creation date in ISO format (e.g., 2024-01-15T10:30:00)",
    )

    return parser.parse_args()


def main():
    """Main entry point for the video uploader."""
    args = parse_args()

    # Load data from JSON file if provided
    json_data = {}
    if args.json:
        try:
            with open(args.json, "r") as f:
                json_data = json.load(f)
            print(f"📄 Loaded configuration from: {args.json}\n")
        except FileNotFoundError:
            print(f"❌ Error: JSON file not found: {args.json}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON file: {e}")
            sys.exit(1)

    # Merge JSON data with command-line args (args take precedence)
    video_path = args.video or json_data.get("video")
    title = args.title or json_data.get("title")
    user_id = args.user_id or json_data.get("user_id") or os.getenv("USER_ID")
    description = args.description or json_data.get("description")
    thumbnail = args.thumbnail or json_data.get("thumbnail")
    tags = args.tags or json_data.get("tags")
    view_count = args.view_count or json_data.get("view_count")
    external_ref = args.external_ref or json_data.get("external_reference")
    created_at_str = args.created_at or json_data.get("created_at")

    # Get API key from args or environment
    api_key = args.api_key or os.getenv("API_KEY")
    if not api_key:
        print("❌ Error: API key is required")
        print("Provide via --api-key argument or API_KEY environment variable")
        sys.exit(1)

    # Validate required fields
    if not video_path:
        print("❌ Error: Video path is required")
        print("Provide via --video argument or 'video' field in JSON file")
        sys.exit(1)

    if not title:
        print("❌ Error: Title is required")
        print("Provide via --title argument or 'title' field in JSON file")
        sys.exit(1)

    if not user_id:
        print("❌ Error: User ID is required")
        print("Provide via --user-id argument, 'user_id' field in JSON, or USER_ID environment variable")
        sys.exit(1)

    # Parse creators from args or JSON
    creators = None
    if args.creators:
        # Command-line args take precedence
        try:
            creators = [json.loads(c) for c in args.creators]
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing creators from args: {e}")
            print('Expected format: {"id":"creator_id","role":"performer"}')
            sys.exit(1)
    elif json_data.get("creators"):
        creators = json_data.get("creators")

    # Validate creator format if provided
    if creators:
        try:
            for creator in creators:
                # Creator must have 'role' field
                if "role" not in creator:
                    raise ValueError("Creator must have 'role' field")
                
                # Validate role
                if creator["role"] not in ["performer", "producer"]:
                    raise ValueError(f"Invalid role: {creator['role']}")
                
                # Creator must have either 'id' (existing) or 'username' (to create)
                if "id" not in creator and "username" not in creator:
                    raise ValueError("Creator must have either 'id' or 'username' field")
        except (ValueError, TypeError) as e:
            print(f"❌ Error validating creators: {e}")
            print('Expected formats:')
            print('  - Existing: {"id":"creator_id","role":"performer"}')
            print('  - New: {"username":"creator_name","display_name":"Name","role":"performer"}')
            sys.exit(1)

    # Parse created_at if provided
    created_at = None
    if created_at_str:
        try:
            created_at = datetime.fromisoformat(created_at_str)
        except ValueError as e:
            print(f"❌ Error parsing created-at date: {e}")
            print("Expected ISO format: 2024-01-15T10:30:00")
            sys.exit(1)

    # Initialize uploader
    uploader = VideoUploader(base_url=args.api_url, api_key=api_key)

    try:
        print(f"📤 Uploading video: {title}")
        print(f"   Video path: {video_path}")
        if thumbnail:
            print(f"   Thumbnail: {thumbnail}")
        if external_ref:
            print(f"   External ref: {external_ref}")
        if tags:
            print(f"   Tags: {', '.join(tags)}")
        if creators:
            print(f"   Creators: {len(creators)}")
        print()

        result = uploader.upload_video(
            video_path=video_path,
            title=title,
            user_id=user_id,
            description=description,
            thumbnail_path=thumbnail,
            creators=creators,
            tags=tags,
            view_count=view_count,
            external_reference=external_ref,
            created_at=created_at,
        )

        print(f"\n✅ Upload successful!")
        print(f"   Video ID: {result['videoId']}")
        print(f"   S3 Bucket: {result['bucket']}")
        print(f"   S3 Key: {result['key']}")

    except requests.HTTPError as e:
        if e.response.status_code == 409:
            # Video with external reference already exists
            error_data = e.response.json()
            print(f"\n⚠️  Video already exists!")
            print(f"   External Reference: {error_data.get('externalReference')}")
            print(f"   Existing Video ID: {error_data.get('videoId')}")
            sys.exit(2)  # Exit with different code for duplicate
        else:
            print(f"\n❌ HTTP Error {e.response.status_code}: {e}")
            try:
                error_data = e.response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"   Response: {e.response.text}")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

