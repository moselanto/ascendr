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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Stage */}
      <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#1e293b,#0f172a)] text-white">
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
          <div className="text-center">
            <div className="mx-auto mb-2.5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[22px] font-bold">
              {hostInitials}
            </div>
            <div className="font-bold">{hostName}</div>
            <div className="text-small opacity-70">
              {isLive ? "Host · presenting" : isHost ? "Ready to go live" : "Waiting for host"}
            </div>
          </div>
        )}

        {(isLive || broadcasting) && (
          <span className="absolute left-3 top-3 rounded-full bg-danger px-2.5 py-1 text-caption font-semibold text-white">
            ● LIVE
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-caption font-semibold text-white">
          ⦿ REC
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/15 px-2.5 py-1 text-caption font-semibold text-white">
          👁 {watching} watching
        </span>
      </div>

      {/* Host broadcast controls */}
      {isHost && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-3">
          {!broadcasting ? (
            <button
              onClick={startBroadcast}
              className="rounded-sm bg-danger px-4 py-2 text-small font-semibold text-white hover:opacity-95"
            >
              ● Go live from your camera
            </button>
          ) : (
            <>
              <button
                onClick={toggleCam}
                className="rounded-sm border border-border px-3 py-2 text-small font-semibold hover:border-primary"
              >
                {camOn ? "📹 Camera on" : "📷 Camera off"}
              </button>
              <button
                onClick={toggleMic}
                className="rounded-sm border border-border px-3 py-2 text-small font-semibold hover:border-primary"
              >
                {micOn ? "🎙️ Mic on" : "🔇 Mic off"}
              </button>
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="rounded-sm border border-border px-3 py-2 text-small font-semibold hover:border-primary"
                >
                  ⦿ Record
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-sm border border-danger px-3 py-2 text-small font-semibold text-danger"
                >
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-danger" />
                  Stop recording
                </button>
              )}
              <button
                onClick={stopBroadcast}
                className="ml-auto rounded-sm border border-danger px-3 py-2 text-small font-semibold text-danger hover:bg-[#fef2f2]"
              >
                Stop camera
              </button>
            </>
          )}
        </div>
      )}

      {/* Recording ready — download the captured file */}
      {recordingUrl && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-[#ecfdf5] px-3.5 py-3 text-small text-[#047857]">
          <span className="font-semibold">Recording ready</span>
          <a
            href={recordingUrl}
            download={`ascendr-live-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`}
            className="rounded-sm bg-accent px-3 py-1.5 font-semibold text-white hover:opacity-95"
          >
            ⬇ Download recording
          </a>
          <span className="text-caption text-text-secondary">
            Saved locally in your browser — download to keep it.
          </span>
        </div>
      )}

      {error && (
        <div className="border-b border-border bg-[#fef2f2] px-3.5 py-2 text-caption text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
