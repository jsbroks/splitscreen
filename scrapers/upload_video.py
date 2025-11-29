#!/usr/bin/env python3
"""
Example script for uploading videos to the API endpoint.

This script demonstrates two authentication methods:
1. API Key authentication (recommended for programmatic access)
2. Session-based authentication (for user-authenticated requests)

Requirements:
    pip install requests
"""

import os
import sys
from pathlib import Path
from typing import Optional

import requests


class VideoUploader:
    """Client for uploading videos to the video platform API."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        session_cookie: Optional[str] = None,
    ):
        """
        Initialize the video uploader.

        Args:
            base_url: The base URL of the API (e.g., "http://localhost:3000")
            api_key: API key for authentication (optional)
            session_cookie: Session cookie for authentication (optional)
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.session_cookie = session_cookie

        if not api_key and not session_cookie:
            raise ValueError("Either api_key or session_cookie must be provided")

    def create_video(
        self,
        title: str,
        filename: str,
        description: Optional[str] = None,
        content_type: Optional[str] = None,
        thumbnail_filename: Optional[str] = None,
        thumbnail_content_type: Optional[str] = None,
        creator_id: Optional[str] = None,
        featured_creator_ids: Optional[list[str]] = None,
        tags: Optional[list[str]] = None,
        user_id: Optional[str] = None,
    ) -> dict:
        """
        Create a video upload and get signed URLs.

        Args:
            title: Video title
            filename: Video filename (e.g., "video.mp4")
            description: Optional video description
            content_type: Optional content type (e.g., "video/mp4")
            thumbnail_filename: Optional thumbnail filename
            thumbnail_content_type: Optional thumbnail content type
            creator_id: Optional creator ID
            featured_creator_ids: Optional list of featured creator IDs
            tags: Optional list of tags
            user_id: Required when using API key authentication

        Returns:
            dict: Response containing videoId, uploadUrl, etc.
        """
        url = f"{self.base_url}/api/v1/upload"

        # Prepare request payload
        payload = {
            "title": title,
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
        if creator_id:
            payload["creatorId"] = creator_id
        if featured_creator_ids:
            payload["featuredCreatorIds"] = featured_creator_ids
        if tags:
            payload["tags"] = tags

        # Add userId for API key authentication
        if self.api_key and user_id:
            payload["userId"] = user_id
        elif self.api_key and not user_id:
            raise ValueError("user_id is required when using API key authentication")

        # Prepare headers
        headers = {"Content-Type": "application/json"}

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Prepare cookies
        cookies = {}
        if self.session_cookie:
            cookies["better-auth.session_token"] = self.session_cookie

        # Make request
        response = requests.post(url, json=payload, headers=headers, cookies=cookies)
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
        description: Optional[str] = None,
        thumbnail_path: Optional[str] = None,
        creator_id: Optional[str] = None,
        featured_creator_ids: Optional[list[str]] = None,
        tags: Optional[list[str]] = None,
        user_id: Optional[str] = None,
    ) -> dict:
        """
        Complete video upload workflow: create video and upload files.

        Args:
            video_path: Path to video file
            title: Video title
            description: Optional video description
            thumbnail_path: Optional path to thumbnail image
            creator_id: Optional creator ID
            featured_creator_ids: Optional list of featured creator IDs
            tags: Optional list of tags
            user_id: Required when using API key authentication

        Returns:
            dict: Response containing videoId and other details
        """
        video_file = Path(video_path)
        if not video_file.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        # Detect content type
        content_type = self._get_content_type(video_file)

        # Prepare thumbnail info if provided
        thumbnail_filename = None
        thumbnail_content_type = None
        if thumbnail_path:
            thumb_file = Path(thumbnail_path)
            if not thumb_file.exists():
                raise FileNotFoundError(f"Thumbnail file not found: {thumbnail_path}")
            thumbnail_filename = thumb_file.name
            thumbnail_content_type = self._get_content_type(thumb_file)

        # Create video and get upload URLs
        print(f"Creating video upload for: {title}")
        response = self.create_video(
            title=title,
            filename=video_file.name,
            description=description,
            content_type=content_type,
            thumbnail_filename=thumbnail_filename,
            thumbnail_content_type=thumbnail_content_type,
            creator_id=creator_id,
            featured_creator_ids=featured_creator_ids,
            tags=tags,
            user_id=user_id,
        )

        video_id = response["videoId"]
        print(f"Video created with ID: {video_id}")

        # Upload video file
        print(f"Uploading video file: {video_path}")
        self.upload_file_to_s3(response["uploadUrl"], video_path, content_type)
        print("Video file uploaded successfully")

        # Upload thumbnail if provided
        if thumbnail_path and response.get("thumbnailUploadUrl"):
            print(f"Uploading thumbnail: {thumbnail_path}")
            self.upload_file_to_s3(
                response["thumbnailUploadUrl"],
                thumbnail_path,
                thumbnail_content_type or "image/jpeg",
            )
            print("Thumbnail uploaded successfully")

        return response

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


def main():
    """Example usage of the VideoUploader."""

    # Configuration - adjust these values
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")
    API_KEY = os.getenv("API_KEY")  # Your API key
    USER_ID = os.getenv("USER_ID")  # Required when using API key
    SESSION_COOKIE = os.getenv("SESSION_COOKIE")  # Alternative to API key

    # Example 1: Upload with API key authentication
    if API_KEY and USER_ID:
        print("=== Example 1: API Key Authentication ===\n")

        uploader = VideoUploader(base_url=API_BASE_URL, api_key=API_KEY)

        try:
            result = uploader.upload_video(
                video_path="path/to/your/video.mp4",
                title="My Awesome Video",
                description="This is a great video uploaded via API",
                thumbnail_path="path/to/your/thumbnail.jpg",  # Optional
                tags=["gaming", "tutorial"],  # Optional
                user_id=USER_ID,
            )

            print(f"\n✅ Upload successful!")
            print(f"Video ID: {result['videoId']}")
            print(f"S3 Key: {result['key']}")
            print(f"Bucket: {result['bucket']}")

        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)

    else:
        print("❌ Error: Please provide either API_KEY + USER_ID or SESSION_COOKIE")
        print("\nUsage:")
        print("  # With API key:")
        print("  export API_KEY='your-api-key'")
        print("  export USER_ID='your-user-id'")
        print("  export API_BASE_URL='http://localhost:3000'")
        print("  python upload_video.py")
        print("\n  # With session cookie:")
        print("  export SESSION_COOKIE='your-session-cookie'")
        print("  export API_BASE_URL='http://localhost:3000'")
        print("  python upload_video.py")
        sys.exit(1)


if __name__ == "__main__":
    main()

