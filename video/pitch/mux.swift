// Joins the rendered video with the mixed audio: ./mux video_only.mp4 audio.m4a final.mp4
import AVFoundation
let v = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1])), a = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[2])), out = URL(fileURLWithPath: CommandLine.arguments[3]); try? FileManager.default.removeItem(at: out)
let c = AVMutableComposition(); let r = CMTimeRange(start: .zero, duration: v.duration)
try! c.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(r, of: v.tracks(withMediaType: .video)[0], at: .zero)
let ar = CMTimeRange(start: .zero, duration: CMTimeMinimum(v.duration, a.duration))
try! c.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(ar, of: a.tracks(withMediaType: .audio)[0], at: .zero)
let e = AVAssetExportSession(asset: c, presetName: AVAssetExportPresetPassthrough)!; e.outputURL = out; e.outputFileType = .mp4
let s = DispatchSemaphore(value: 0); e.exportAsynchronously { print("export status", e.status.rawValue, e.error as Any); s.signal() }; s.wait()
