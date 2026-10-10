"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live video stage.
 *
 * The host can "Go live" from anywhere using their device camera + mic
 * (getUserMedia) — the stream shows in the stage immediately. This is the
 * zero-infrastructure path: the host's own preview broadcasts to the room via
 * the existing session status (viewers see the LIVE state + host presence).
 * A full SFU (LiveKit) can be layered in later using the same stage shell;
 * the env already reserves LIVEKIT_API_KEY for that.
 *
 * Non-host viewers see the host avatar + LIVE/REC treatment matching the
 * ASCENDR live design.
 */
export default function LiveStage({
  hostName,
  hostInitials,
  isHost,
  isLive,
  watching = 0,
}: {
  hostName: string;
  hostInitials: string;
  isHost: boolean;
  isLive: boolean;
  watching?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Clean up the camera + any recording when leaving the room.
      try {
        recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Pick a widely-supported recording MIME type. */
  function pickMimeType(): string {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const t of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    }
    return "video/webm";
  }

  function startRecording() {
    if (!streamRef.current) return;
    try {
      // Fresh recording: drop any previous file.
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
        setRecordingUrl(null);
      }
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(streamRef.current, { mimeType });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingUrl(URL.createObjectURL(blob));
      };
      rec.start(1000); // gather data every second
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError("Recording isn't supported in this browser.");
    }
  }

  function stopRecording() {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* noop */
    }
    setRecording(false);
  }

  async function startBroadcast() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setBroadcasting(true);
      setCamOn(true);
      setMicOn(true);
    } catch {
      setError(
        "Camera/mic access was blocked. Allow permissions in your browser to go live."
      );
    }
  }

  function stopBroadcast() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setBroadcasting(false);
  }

  function toggleCam() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  }

  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }

  const smallBtn =
    "rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
      {/* Stage (the page's one dark feature panel) */}
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />

        {/* Host webcam video (only visible while broadcasting) */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${
            broadcasting ? "block" : "hidden"
          }`}
        />

        {/* Avatar fallback when no live video is showing */}
        {!broadcasting && (
          <div className="relative text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-[20px] font-semibold text-brand-700">
              {hostInitials}
            </div>
            <div className="text-[15px] font-semibold">{hostName}</div>
            <div className="text-[13px] text-white/70">
              {isLive ? "Host · presenting" : isHost ? "Ready to go live" : "Waiting for host"}
            </div>
          </div>
        )}

        {(isLive || broadcasting) && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            LIVE
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white">
          {"◉"} REC
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white">
          {watching} watching
        </span>
      </div>

      {/* Host broadcast controls */}
      {isHost && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {!broadcasting ? (
            <button
              onClick={startBroadcast}
              className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
            >
              <span className="h-2 w-2 rounded-full bg-accent" />
              Go live from your camera
            </button>
          ) : (
            <>
              <button onClick={toggleCam} className={smallBtn}>
                {camOn ? "Camera on" : "Camera off"}
              </button>
              <button onClick={toggleMic} className={smallBtn}>
                {micOn ? "Mic on" : "Mic off"}
              </button>
              {!recording ? (
                <button onClick={startRecording} className={smallBtn}>
                  {"◉"} Record
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-danger hover:border-ink/40"
                >
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-danger" />
                  Stop recording
                </button>
              )}
              <button
                onClick={stopBroadcast}
                className="ml-auto rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-danger hover:border-ink/40"
              >
                Stop camera
              </button>
            </>
          )}
        </div>
      )}

      {/* Recording ready — download the captured file */}
      {recordingUrl && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-emerald-50 px-4 py-3 text-[14px] text-emerald-800">
          <span className="font-semibold">Recording ready</span>
          <a
            href={recordingUrl}
            download={`ascendr-live-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`}
            className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-700"
          >
            Download recording
          </a>
          <span className="text-[12px] text-text-secondary">
            Saved locally in your browser. Download to keep it.
          </span>
        </div>
      )}

      {error && (
        <div className="border-b border-border bg-danger/10 px-4 py-2 text-[12px] text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
