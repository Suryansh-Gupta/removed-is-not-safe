#!/usr/bin/env python3
"""Two-pass loudnorm of film/public/music.wav to -14 LUFS, out/master.wav."""
import json,re,subprocess
L='loudnorm=I=-14:TP=-1.2:LRA=14'
r=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-i','film/public/music.wav','-af',L+':print_format=json','-f','null','-'],capture_output=True,text=True).stderr
d=json.loads(r[r.rindex('{'):r.rindex('}')+1]);print('in',d['input_i'],d['input_lra'])
subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i','film/public/music.wav','-af',f"{L}:measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true",'-ar','48000','out/master.wav'],check=True)
