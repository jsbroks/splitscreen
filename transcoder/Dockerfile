# syntax=docker/dockerfile:1

FROM golang:1.25 AS builder
WORKDIR /src

# Cache deps
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Build
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/transcoder ./main.go

FROM debian:bookworm-slim AS runtime
ENV DEBIAN_FRONTEND=noninteractive

# Install ffmpeg with full codec support
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    xz-utils \
  && rm -rf /var/lib/apt/lists/*

# Download and install official FFmpeg build with full codec support
# Using johnvansickle's static builds which include all major codecs
RUN wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
  && tar xf ffmpeg-release-amd64-static.tar.xz \
  && mv ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ffmpeg \
  && mv ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ffprobe \
  && rm -rf ffmpeg-release-amd64-static.tar.xz ffmpeg-*-amd64-static \
  && chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

WORKDIR /app
COPY --from=builder /out/transcoder /usr/local/bin/transcoder

# Set any required env at runtime, e.g.:
# ENV DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=disable

ENV FFMPEG_PATH=/usr/local/bin/ffmpeg
ENV FFPROBE_PATH=/usr/local/bin/ffprobe

ENTRYPOINT ["transcoder"]

