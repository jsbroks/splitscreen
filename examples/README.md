# Video Upload API Examples

This directory contains examples for using the video upload API endpoint.

## API Endpoint

**URL:** `POST /api/v1/upload`

**Authentication:**
- **API Key:** Include `Authorization: Bearer YOUR_API_KEY` header and `userId` in request body
- **Session Cookie:** Include `better-auth.session_token` cookie

## Request Body

```json
{
  "title": "Video Title",
  "filename": "video.mp4",
  "description": "Optional description",
  "contentType": "video/mp4",
  "thumbnailFilename": "thumbnail.jpg",
  "thumbnailContentType": "image/jpeg",
  "creatorId": "optional-creator-id",
  "featuredCreatorIds": ["creator-id-1", "creator-id-2"],
  "tags": ["tag1", "tag2"],
  "userId": "required-for-api-key-auth"
}
```

### Required Fields
- `title`: Video title (string, min 1 character)
- `filename`: Video filename (string, min 1 character)
- `userId`: User ID (required only for API key authentication)

### Optional Fields
- `description`: Video description (string)
- `contentType`: MIME type of the video (default: "application/octet-stream")
- `thumbnailFilename`: Thumbnail filename (string)
- `thumbnailContentType`: MIME type of the thumbnail (default: "image/jpeg")
- `creatorId`: ID of the primary creator (string)
- `featuredCreatorIds`: Array of featured creator IDs (string[])
- `tags`: Array of tag names (string[]) - tags are created if they don't exist

## Response

```json
{
  "videoId": "generated-video-id",
  "key": "originals/video-id/video.mp4",
  "uploadUrl": "https://s3.../presigned-url-for-video",
  "bucket": "your-bucket-name",
  "thumbnailUploadUrl": "https://s3.../presigned-url-for-thumbnail",
  "thumbnailKey": "originals/video-id/thumbnail.jpg"
}
```

## Upload Workflow

1. **Create Video Entry:** Make a POST request to `/api/v1/upload` with video metadata
2. **Upload Video File:** Use the returned `uploadUrl` to PUT the video file to S3
3. **Upload Thumbnail (Optional):** Use the returned `thumbnailUploadUrl` to PUT the thumbnail to S3

The signed URLs expire after 30 minutes.

## Python Example

See `upload_video.py` for a complete Python implementation.

### Installation

```bash
pip install requests
```

### Usage with API Key

```bash
export API_KEY='your-api-key'
export USER_ID='your-user-id'
export API_BASE_URL='http://localhost:3000'
python upload_video.py
```

### Usage with Session Cookie

```bash
export SESSION_COOKIE='your-session-cookie'
export API_BASE_URL='http://localhost:3000'
python upload_video.py
```

### Programmatic Usage

```python
from upload_video import VideoUploader

# Initialize with API key
uploader = VideoUploader(
    base_url="http://localhost:3000",
    api_key="your-api-key"
)

# Upload video
result = uploader.upload_video(
    video_path="path/to/video.mp4",
    title="My Video",
    description="Video description",
    thumbnail_path="path/to/thumbnail.jpg",
    tags=["tag1", "tag2"],
    user_id="your-user-id"
)

print(f"Video uploaded! ID: {result['videoId']}")
```

## cURL Example

### With API Key

```bash
# Step 1: Create video entry and get upload URLs
curl -X POST http://localhost:3000/api/v1/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "title": "My Video",
    "filename": "video.mp4",
    "contentType": "video/mp4",
    "description": "Optional description",
    "tags": ["gaming", "tutorial"],
    "userId": "YOUR_USER_ID"
  }' > response.json

# Step 2: Extract upload URL and upload video
UPLOAD_URL=$(cat response.json | jq -r '.uploadUrl')
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary @path/to/video.mp4

# Step 3: Upload thumbnail (if provided)
THUMBNAIL_URL=$(cat response.json | jq -r '.thumbnailUploadUrl')
if [ "$THUMBNAIL_URL" != "null" ]; then
  curl -X PUT "$THUMBNAIL_URL" \
    -H "Content-Type: image/jpeg" \
    --data-binary @path/to/thumbnail.jpg
fi
```

### With Session Cookie

```bash
# Get your session cookie from browser DevTools
SESSION_COOKIE="your-session-token-here"

curl -X POST http://localhost:3000/api/v1/upload \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=$SESSION_COOKIE" \
  -d '{
    "title": "My Video",
    "filename": "video.mp4",
    "contentType": "video/mp4"
  }'
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "path": ["title"],
      "message": "Title is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized - please provide a valid session or API key"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Notes

- Videos are automatically added to the transcode queue after upload
- Videos start with "in_review" status and need admin approval before being public
- The API supports both video files and optional thumbnail images
- Signed URLs expire after 30 minutes
- Tags are automatically created if they don't exist
- The system uses Typesense for video search (updated asynchronously)

