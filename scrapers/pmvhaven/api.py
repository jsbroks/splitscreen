import datetime
from enum import Enum
import requests

url = "https://pmvhaven.com/api/videos/trending?period=1h&limit=50&page=1"

one_week_ago = datetime.datetime.now(datetime.UTC) - datetime.timedelta(weeks=1)

import yaml
from pathlib import Path

def load_creators_map(yaml_path: str = "videos/star-mapping.yaml") -> dict:
    import os
    base_dir = os.path.dirname(__file__)
    yaml_file = Path(base_dir) / yaml_path
    if not yaml_file.exists():
        return {}
    with open(yaml_file, "r", encoding="utf-8") as f:
        creators_map = yaml.safe_load(f)
        return creators_map if creators_map else {}


creators_map = load_creators_map()

print(creators_map)

class Video:
    def __init__(self, data: dict):
        self.id: str = data['_id']
        self.data = data
        self.title: str = data['title']

        # Parse ISO 8601 date string (e.g. "2025-11-29T05:33:19.680Z") to datetime object
        self.upload_date = datetime.datetime.strptime(
            data['uploadDate'], "%Y-%m-%dT%H:%M:%S.%fZ"
        ).replace(tzinfo=datetime.timezone.utc)
    
        self.tags: list[str] = data['tags']
        self.tags.append("PMV")

        self.stars: list[str] = data['starsTags']
        self.uploader: list[str] = data['uploader']
        self.uploader_avatar: str = data['uploaderAvatarUrl']
        self.uploader_username: str = data['uploaderUsername']

        self.video_url: str = data['videoUrl']
        self.thumbnail_url: str = data['thumbnailUrl']

    def download_video(self, dest_path: str):
        """
        Download the video file associated with this Video object to the specified destination path.

        Args:
            dest_path (str): Path where the video should be saved.
        """
        if not self.video_url:
            raise ValueError("No video URL found in video data.")
        response = requests.get(self.video_url, stream=True)
        response.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        return dest_path

    def download_thumbnail(self, dest_path: str):
        """
        Download the thumbnail image for this video to the specified destination path.

        Args:
            dest_path (str): Path where the thumbnail image should be saved.
        """
        if not self.thumbnail_url:
            raise ValueError("No thumbnail URL found in video data.")

        response = requests.get(self.thumbnail_url, stream=True)
        response.raise_for_status()

        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        return dest_path

class Sort(Enum):
    UPLOAD_DATE = "-uploadDate"
    LIKES = "-likes"
    VIEWS = "-views"
    DISLIKES = "-dislikes"

def get_videos(limit: int = 50, page: int = 1, sort: str = "", from_date: datetime.date = None):
    update_date_from = one_week_ago.isoformat(timespec="milliseconds").replace("+00:00", "Z") if from_date else ""
    url = f"https://pmvhaven.com/api/videos?page={page}&limit={limit}&sort={sort}&updateDateFrom={update_date_from}"
    response = requests.get(url)
    data = response.json()
    return [Video(video) for video in data["data"]]


def video_tags_stats(video_id: str):
    url = f"https://pmvhaven.com/api/videos/{video_id}/tags/stats"
    response = requests.get(url)
    data = response.json()

    tags = [tag["tag"] for tag in data["data"]["tags"]]
    stars = [star["star"] for star in data["data"]["stars"]]

    return tags, stars

if __name__ == "__main__":
    import json

    videos = get_videos(limit=100, page=1, sort=Sort.VIEWS.value, from_date=one_week_ago)

    for idx, video in enumerate(videos):
        # Create a filename based on video id or index
        json_filename = f"pmvhaven/videos/video_{idx}.json"

        creators = [
            {
                "username": video.uploader_username,
                "display_name": video.uploader,
                "image": video.uploader_avatar,
                "role": "producer"
            }
        ]
        for star in video.stars:
            creators.append({
                "username": creators_map.get(star),
                "raw_creator": star,
                "role": "performer"
            })

        data = {
            "title": video.title.strip(),
            "video": video.video_url,
            "thumbnail": video.thumbnail_url,
            "created_at": video.upload_date.isoformat(),

            "view_count": video.data["views"],

            "tags": video.tags,

            "url": f"https://pmvhaven.com/video/{video.id}",

            "external_reference": f"pmvhaven:{video.id}",
            "creators": creators,

            "hls": f"https://video.pmvhaven.com/{video.id}/master.m3u8",
        }

        # Pretty print to file
        with open(json_filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"Saved video info to {json_filename}")