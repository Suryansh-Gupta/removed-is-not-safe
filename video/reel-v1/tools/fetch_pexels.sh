#!/bin/bash
# id|filename pairs; Pexels free license, no attribution required
while read -r id file; do [ -z "$id" ] && continue
  case "$file" in hd_*|uhd_*) name="$id-$file";; *) name="$file";; esac
  [ -s "px_$id.mp4" ] && continue
  curl -sL --fail -A "Mozilla/5.0" --max-time 120 -o "px_$id.mp4" "https://videos.pexels.com/video-files/$id/$name" || { echo "FAIL $id $name"; rm -f "px_$id.mp4"; }
  sleep 0.5
done
