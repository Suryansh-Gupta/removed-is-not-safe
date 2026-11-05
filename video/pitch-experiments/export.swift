// Renders index.html to an MP4 with no extra installs: swiftc -O export.swift -o export && ./export out.mp4
import AppKit
import AVFoundation
import WebKit
let here = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let outURL = URL(fileURLWithPath: CommandLine.arguments[1]); try? FileManager.default.removeItem(at: outURL)
let fps = 30.0, W = 1920, H = 1080
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8_000_000]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: 1280, height: 720))
class Nav: NSObject, WKNavigationDelegate { func webView(_ w: WKWebView, didFinish n: WKNavigation!) { begin() } }
let nav = Nav(); web.navigationDelegate = nav
var total = 0.0, frame = 0
func begin() { web.evaluateJavaScript("TOTAL") { v, e in total = v as! Double; next() } }
func next() {
  if Double(frame) / fps >= total { input.markAsFinished(); writer.finishWriting { print("wrote", frame, "frames", writer.status.rawValue, writer.error as Any); exit(0) }; return }
  web.evaluateJavaScript("renderFrame(\(Double(frame) / fps))") { v, e in
    if let e = e { print("JS error at frame", frame, e); exit(1) }
    let s = v as! String, data = Data(base64Encoded: String(s.dropFirst(s.range(of: ",")!.upperBound.utf16Offset(in: s))))!
    let cg = NSBitmapImageRep(data: data)!.cgImage!
    var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb); CVPixelBufferLockBaseAddress(pb!, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H)); CVPixelBufferUnlockBaseAddress(pb!, [])
    func push() { if input.isReadyForMoreMediaData { adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: 30)); frame += 1; if frame % 300 == 0 { print(frame, "frames") }; next() } else { DispatchQueue.main.asyncAfter(deadline: .now() + 0.01, execute: push) } }
    push()
  }
}
var c = URLComponents(url: here.appendingPathComponent("index.html"), resolvingAgainstBaseURL: false)!; c.fragment = "export"
web.loadFileURL(c.url!, allowingReadAccessTo: here)
RunLoop.main.run()
