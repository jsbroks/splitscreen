export DATABASE_URL="postgresql://postgres:postgres@localhost:5499/appdb?sslmode=disable"
export S3_BUCKET=splithaven
export S3_ENDPOINT=https://25844977d6037335b3c892d222f54af2.r2.cloudflarestorage.com
export S3_PUBLIC_URL_BASE=https://media.splithaven.com
export S3_ACCESS_KEY_ID=0d9bf74f7dcd3bf91cbd4c64f47a28b2
export S3_SECRET_ACCESS_KEY=cfb89fdcceb64eb3be6a16faaba936bb3fb3c88aae066bb727f0b6b71ec1d06e
export S3_REGION=auto
export S3_FORCE_PATH_STYLE="false"

export FFMPEG_PATH="/opt/homebrew/bin/ffmpeg"
export FFPROBE_PATH="/opt/homebrew/bin/ffprobe"
export WORKER_CONCURRENCY=1
export MAX_PARALLEL_TASKS_PER_JOB=1
export MAX_PARALLEL_RENDITIONS=1

(cd transcoder && go run main.go)