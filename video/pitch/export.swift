// Renders timeline.js to video: swiftc -O export.swift -o export && ./export old_pitch.mp4 video_only.mp4
import AppKit
import AVFoundation
import WebKit
let here = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let oldAsset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let outURL = URL(fileURLWithPath: CommandLine.arguments[2]); try? FileManager.default.removeItem(at: outURL)
let gen = AVAssetImageGenerator(asset: oldAsset); gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero; gen.appliesPreferredTrackTransform = true
let fps = 30.0, W = 1920, H = 1080
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 7_000_000]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
struct Seg { let id, type: String; let from: Double; let dur: Double; let fade: Double; let start: Double }
var segs = [Seg](), total = 0.0, frame = 0, prev: CGImage?, prevScale: CGFloat = 1, last: CGImage?, lastScale: CGFloat = 1, curSeg = -1
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: 1280, height: 720))
class Nav: NSObject, WKNavigationDelegate { func webView(_ w: WKWebView, didFinish n: WKNavigation!) { waitFonts() } }
let nav = Nav(); web.navigationDelegate = nav
func waitFonts() { web.evaluateJavaScript("window.FONTS_READY === true") { v, _ in if (v as? Bool) == true { load() } else { DispatchQueue.main.asyncAfter(deadline: .now() + 0.2, execute: waitFonts) } } }
func load() { web.evaluateJavaScript("JSON.stringify(TIMELINE)") { v, _ in
  let arr = try! JSONSerialization.jsonObject(with: (v as! String).data(using: .utf8)!) as! [[String: Any]]
  var t = 0.0
  for s in arr { let type = s["type"] as! String; let from = (s["from"] as? Double) ?? 0; let dur = type == "old" ? (s["to"] as! Double) - from : s["dur"] as! Double
    segs.append(Seg(id: s["id"] as! String, type: type, from: from, dur: dur, fade: (s["fade"] as? Double) ?? 0, start: t)); t += dur }
  total = t; print("total", total); next() } }
func compose(_ img: CGImage, _ seg: Seg, _ local: Double) {
  // Old clips get a slow push-in so nothing sits frozen.
  let scale: CGFloat = seg.type == "old" ? 1 + 0.025 * CGFloat(local / seg.dur) : 1
  var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb); CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.interpolationQuality = .high
  func put(_ i: CGImage, _ s: CGFloat, _ a: CGFloat) { let w = CGFloat(W) * s, h = CGFloat(H) * s; ctx.setAlpha(a); ctx.draw(i, in: CGRect(x: (CGFloat(W) - w) / 2, y: (CGFloat(H) - h) / 2, width: w, height: h)) }
  if seg.fade > 0, local < seg.fade, let p = prev { put(p, prevScale, 1); put(img, scale, CGFloat(local / seg.fade)) } else { put(img, scale, 1) }
  CVPixelBufferUnlockBaseAddress(pb!, []); last = img; lastScale = scale
  func push() { if input.isReadyForMoreMediaData { adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: 30)); frame += 1; if frame % 900 == 0 { print(frame, "frames") }; DispatchQueue.main.async(execute: next) } else { DispatchQueue.main.asyncAfter(deadline: .now() + 0.01, execute: push) } }
  push()
}
func next() {
  let now = Double(frame) / fps
  if now >= total { input.markAsFinished(); writer.finishWriting { print("wrote", frame, "frames", writer.status.rawValue, writer.error as Any); exit(0) }; return }
  let idx = segs.lastIndex { $0.start <= now + 1e-9 }!, seg = segs[idx], local = now - seg.start
  if idx != curSeg { prev = last; prevScale = lastScale; curSeg = idx }
  if seg.type == "old" { let cg = try! gen.copyCGImage(at: CMTime(seconds: seg.from + local, preferredTimescale: 600), actualTime: nil); compose(cg, seg, local) }
  else { let name = seg.id.replacingOccurrences(of: "\"", with: "\\\"")
    web.evaluateJavaScript("renderFrame(\"\(name)\", \(local))") { v, e in if let e = e { print("JS error", seg.id, local, e); exit(1) }
      let s = v as! String, comma = s.firstIndex(of: ",")!, data = Data(base64Encoded: String(s[s.index(after: comma)...]))!
      compose(NSBitmapImageRep(data: data)!.cgImage!, seg, local) } }
}
var c = URLComponents(url: here.appendingPathComponent("index.html"), resolvingAgainstBaseURL: false)!; c.fragment = "export"
web.loadFileURL(c.url!, allowingReadAccessTo: here)
RunLoop.main.run()
