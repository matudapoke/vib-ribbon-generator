import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Play, Pause, RefreshCw, Download, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import Renderer from './components/Renderer';
import Controls from './components/Controls';
import { processor } from './utils/Processor';

import { AudioProcessor } from './utils/AudioProcessor';

function App() {
  const [ready, setReady] = useState(false);
  const [mediaSrc, setMediaSrc] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [mediaDimensions, setMediaDimensions] = useState({ width: 800, height: 600 });
  const [polylines, setPolylines] = useState([]);
  const [settings, setSettings] = useState({
    jitterAmount: 2,
    jitterSpeed: 30,
    threshold1: 100,
    threshold2: 200,
    epsilonFactor: 0.025
  });
  const [processing, setProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioProcessorRef = useRef(new AudioProcessor());

  useEffect(() => {
    const checkCv = setInterval(() => {
      if (processor.isReady()) {
        setReady(true);
        clearInterval(checkCv);
      }
    }, 100);
    return () => clearInterval(checkCv);
  }, []);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

    try {
      const lines = await processor.processImage(videoRef.current, settings);
      setPolylines(lines);
    } catch (e) {
      console.error("Frame processing failed", e);
    }

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(processFrame);
    }
  }, [settings, isPlaying]);

  useEffect(() => {
    if (isPlaying && mediaType === 'video') {
      videoRef.current.play();
      rafRef.current = requestAnimationFrame(processFrame);
    } else if (mediaType === 'video' && videoRef.current) {
      videoRef.current.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [isPlaying, mediaType, processFrame]);

  const processImage = useCallback(async () => {
    if (!mediaSrc || !ready || mediaType !== 'image') return;
    setProcessing(true);

    const img = new Image();
    img.src = mediaSrc;
    img.onload = async () => {
      setMediaDimensions({ width: img.width, height: img.height });
      try {
        const lines = await processor.processImage(img, settings);
        setPolylines(lines);
      } catch (e) {
        console.error("Processing failed", e);
      }
      setProcessing(false);
    };
  }, [mediaSrc, ready, settings, mediaType]);

  useEffect(() => {
    if (mediaType === 'image') {
      processImage();
    }
  }, [processImage, mediaType]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMediaSrc(url);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      setIsPlaying(false);
      setPolylines([]);
      setMediaDimensions({ width: 800, height: 600 }); // Reset dimensions until new media loads
    }
  }, []);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const saveImage = () => {
    const canvas = document.querySelector('.renderer-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'vib-ribbon-export.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const startRecording = () => {
    const canvas = document.querySelector('.renderer-canvas');
    if (!canvas || isRecording) return;

    setIsRecording(true);
    setRecordingProgress(0);

    // Setup Audio
    if (mediaType === 'video' && videoRef.current) {
      audioProcessorRef.current.init(videoRef.current);
      audioProcessorRef.current.setHighPitch(settings.highPitch);
    }

    // Setup MediaStream
    const canvasStream = canvas.captureStream(30); // 30 FPS
    let finalStream = canvasStream;

    if (mediaType === 'video' && videoRef.current) {
      // Mix audio
      const audioDest = audioProcessorRef.current.destination;
      const audioTracks = audioDest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        finalStream.addTrack(audioTracks[0]);
      }

      // Ensure video is playing
      if (!isPlaying) {
        setIsPlaying(true);
        videoRef.current.play();
      }
    }

    const chunks = [];
    const mediaRecorder = new MediaRecorder(finalStream, {
      mimeType: 'video/webm;codecs=vp9,opus' // Prefer WebM VP9
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vib-ribbon-export.webm';
      link.click();

      setIsRecording(false);
      setRecordingProgress(0);
      if (mediaType === 'video') {
        setIsPlaying(false);
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Reset
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();

    // Auto-stop after duration
    const duration = mediaType === 'video' ? (videoRef.current.duration * 1000) : 5000; // Full video or 5s for image

    // Progress simulation
    let startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = elapsed / duration;
      setRecordingProgress(p);

      if (p >= 1) {
        clearInterval(progressInterval);
        stopRecording();
      }
    }, 100);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': []
    }
  });

  if (!ready) {
    return <div className="loading">OpenCVを読み込み中...</div>;
  }

  return (
    <div className="app-container">
      <div className="main-content">
        <header>
          <h1>ビブリボンジェネレーター</h1>
          <p>画像や動画をアップロードして、揺れる線画スタイルに変換します。</p>
        </header>

        <div className="workspace">
          <div className="preview-area">
            {!mediaSrc ? (
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Upload size={48} />
                <p>ここに画像・動画をドラッグ＆ドロップ、またはクリックして選択</p>
              </div>
            ) : (
              <div className="canvas-container">
                <Renderer
                  polylines={polylines}
                  jitterAmount={settings.jitterAmount}
                  jitterSpeed={settings.jitterSpeed}
                  width={mediaDimensions.width}
                  height={mediaDimensions.height}
                />
                {mediaType === 'video' && (
                  <>
                    <video
                      ref={videoRef}
                      src={mediaSrc}
                      style={{ display: 'none' }}
                      loop
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        setMediaDimensions({
                          width: e.target.videoWidth,
                          height: e.target.videoHeight
                        });
                      }}
                    />
                  </>
                )}

                <div className="action-bar">
                  {mediaType === 'video' && (
                    <button onClick={togglePlay} className="icon-btn">
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                  )}
                  <button onClick={saveImage} className="icon-btn" title="画像を保存">
                    <ImageIcon size={20} />
                  </button>
                  <button onClick={startRecording} className="icon-btn" disabled={isRecording} title="動画を録画">
                    <VideoIcon size={20} />
                  </button>
                </div>

                {isRecording && (
                  <div className="recording-status">
                    GIF録画中... {Math.min(100, Math.round(recordingProgress * 100))}%
                  </div>
                )}

                {processing && <div className="processing-overlay">処理中...</div>}
              </div>
            )}
          </div>

          <Controls settings={settings} onSettingsChange={setSettings} />
        </div>
      </div>

      <style>{`
        .app-container {
          display: flex;
          width: 100%;
          height: 100vh;
          background: #000;
          color: white;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        header {
          padding: 20px;
          border-bottom: 1px solid #333;
        }
        header h1 {
          margin: 0;
          font-size: 1.5rem;
        }
        header p {
          margin: 5px 0 0;
          color: #888;
        }
        .workspace {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .preview-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050505;
          position: relative;
          flex-direction: column;
          overflow: auto; /* Allow scrolling if canvas is large */
        }
        .dropzone {
          border: 2px dashed #333;
          border-radius: 10px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #666;
        }
        .dropzone:hover, .dropzone.active {
          border-color: white;
          color: white;
          background: #111;
        }
        .canvas-container {
          position: relative;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
          max-width: 100%;
          max-height: 100%;
          display: flex; /* Center canvas */
          justify-content: center;
          align-items: center;
        }
        .processing-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: white;
          font-family: monospace;
        }
        .action-bar {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          padding: 10px;
          border-radius: 20px;
          display: flex;
          gap: 10px;
        }
        .icon-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          color: #ccc;
        }
        .icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .recording-status {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 0, 0, 0.8);
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .workspace {
            flex-direction: column;
          }
          .controls-panel {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid #333;
            flex: 0 0 auto; /* Don't grow, just take needed space or max-height */
            max-height: 40vh !important; /* Limit height to 40% of screen */
          }
          .preview-area {
            flex: 1; /* Take remaining space */
            min-height: 0; /* Allow shrinking */
          }
          header {
            padding: 10px;
            flex: 0 0 auto;
          }
          header h1 {
            font-size: 1.2rem;
          }
          header p {
            display: none; /* Hide description on mobile to save space */
          }
          .dropzone {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
