#!/bin/bash
# Rebuild: cut shots, render picture, add the mastered score. Run from reel-v1.
export PATH=~/.local/bin:$PATH
CH=~/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell
(cd film && npx remotion render Film ../out/video.mp4 --muted --crf=17 --concurrency=6 --browser-executable="$CH") || exit 1
ffmpeg -nostdin -v error -y -i out/video.mp4 -i out/master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest out/final.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 out/final.mp4
