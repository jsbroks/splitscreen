import datetime
from enum import Enum
import requests

url = "https://pmvhaven.com/api/videos/trending?period=1h&limit=50&page=1"

one_week_ago = datetime.datetime.now(datetime.UTC) - datetime.timedelta(weeks=1)

class Video:
    def __init__(self, data: dict):
        self.id: str = data['_id']
        self.data = data
        self.title: str = data['title']
        self.description: str = data['description']
        # Parse ISO 8601 date string (e.g. "2025-11-29T05:33:19.680Z") to datetime object
        self.uploadDate = datetime.datetime.strptime(
            data['uploadDate'], "%Y-%m-%dT%H:%M:%S.%fZ"
        ).replace(tzinfo=datetime.timezone.utc)
    
        self.tags: list[str] = data['tags']
        self.stars: list[str] = data['starsTags']
        self.uploader: list[str] = data['uploader']

    def download_video(self, dest_path: str):
        """
        Download the video file associated with this Video object to the specified destination path.

        Args:
            dest_path (str): Path where the video should be saved.
        """
        video_url = self.data.get('videoUrl')
        if not video_url:
            raise ValueError("No video URL found in video data.")
        response = requests.get(video_url, stream=True)
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
        thumbnail_url = self.data.get('thumbnailUrl')
        if not thumbnail_url:
            raise ValueError("No thumbnail URL found in video data.")

        response = requests.get(thumbnail_url, stream=True)
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


def pprint_json(data):
    """Pretty print a Python object as JSON."""
    import json
    print(json.dumps(data, indent=2, ensure_ascii=False))
    


def video_tags_stats(video_id: str):
    url = f"https://pmvhaven.com/api/videos/{video_id}/tags/stats"
    response = requests.get(url)
    data = response.json()

    tags = [tag["tag"] for tag in data["data"]["tags"]]
    stars = [star["star"] for star in data["data"]["stars"]]

    return tags, stars

videos = get_videos(limit=5, page=1, sort=Sort.UPLOAD_DATE.value, from_date=one_week_ago)
pprint_json(videos)

video_tags_stats("692a9283a7048a867e4398b6")
