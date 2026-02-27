import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

const cleanupAudioUrl = (audioRef, objectUrlRef) => {
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.removeAttribute("src");
    audioRef.current.load();
  }

  if (objectUrlRef.current) {
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }
};

export default function VoiceMentorButton() {
  const { getIdToken } = useAuthContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Hold to talk to your AI mentor");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pointerIsDownRef = useRef(false);

  const stopMicStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const stopInFlightRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopMicStream();
      stopInFlightRequest();
      cleanupAudioUrl(audioRef, objectUrlRef);
    };
  }, []);

  const playFallbackBlob = async (response) => {
    const responseBlob = await response.blob();
    cleanupAudioUrl(audioRef, objectUrlRef);
    objectUrlRef.current = URL.createObjectURL(responseBlob);
    if (audioRef.current) {
      audioRef.current.src = objectUrlRef.current;
      await audioRef.current.play();
    }
  };

  const playWithMediaSource = async (response, contentType) => {
    if (!response.body || typeof MediaSource === "undefined" || !MediaSource.isTypeSupported(contentType)) {
      await playFallbackBlob(response);
      return;
    }

    cleanupAudioUrl(audioRef, objectUrlRef);
    const mediaSource = new MediaSource();
    objectUrlRef.current = URL.createObjectURL(mediaSource);

    if (!audioRef.current) return;
    audioRef.current.src = objectUrlRef.current;
    await audioRef.current.play().catch(() => null);

    await new Promise((resolve, reject) => {
      const queue = [];
      let sourceBuffer;
      let streamFinished = false;

      const appendNextChunk = () => {
        if (!sourceBuffer || sourceBuffer.updating) return;

        if (queue.length > 0) {
          sourceBuffer.appendBuffer(queue.shift());
          return;
        }

        if (streamFinished && mediaSource.readyState === "open") {
          try {
            mediaSource.endOfStream();
          } catch (error) {
            console.warn("endOfStream failed:", error.message);
          }
          resolve();
        }
      };

      const pump = async () => {
        try {
          const reader = response.body.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              streamFinished = true;
              appendNextChunk();
              break;
            }

            if (value?.byteLength) {
              queue.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
              appendNextChunk();
              if (audioRef.current?.paused) {
                audioRef.current.play().catch(() => null);
              }
            }
          }
        } catch (error) {
          reject(error);
        }
      };

      mediaSource.addEventListener(
        "sourceopen",
        () => {
          try {
            sourceBuffer = mediaSource.addSourceBuffer(contentType);
            sourceBuffer.mode = "sequence";
            sourceBuffer.addEventListener("updateend", appendNextChunk);
            pump();
          } catch (error) {
            reject(error);
          }
        },
        { once: true }
      );
    });
  };

  const sendAudioToMentor = async (audioBlob, mimeType) => {
    const token = await getIdToken();
    if (!token) {
      throw new Error("You must be logged in to use voice mentor.");
    }

    stopInFlightRequest();
    abortControllerRef.current = new AbortController();

    const response = await fetch(`${API_BASE_URL}/api/voice/mentor`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType || "audio/webm",
      },
      body: audioBlob,
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const responseText = await response.text();
      let responseErrorMessage = responseText;
      try {
        const parsed = JSON.parse(responseText);
        responseErrorMessage = parsed?.error || parsed?.details || responseText;
      } catch {
        // Non-JSON error body
      }
      throw new Error(responseErrorMessage || "Voice conversion failed.");
    }

    const contentType = (response.headers.get("content-type") || "audio/mpeg").split(";")[0].trim();
    return {
      playbackPromise: playWithMediaSource(response, contentType),
    };
  };

  const handleRecorderStop = async (mimeType) => {
    setIsRecording(false);
    stopMicStream();

    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
    audioChunksRef.current = [];

    if (!audioBlob.size) {
      setStatus("No audio captured");
      setError("Please hold the button slightly longer before releasing.");
      return;
    }

    setIsProcessing(true);
    setStatus("Generating mentor voice...");
    setError("");

    try {
      const { playbackPromise } = await sendAudioToMentor(audioBlob, mimeType);
      setIsProcessing(false);
      setStatus("Playing mentor response...");
      await playbackPromise;
      setStatus("Mentor response ready");
    } catch (requestError) {
      console.error("Voice mentor error:", requestError.message);
      setStatus("Voice mentor unavailable");
      setError(requestError.message || "Unable to process voice request.");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (isProcessing || isRecording) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support microphone recording.");
      return;
    }

    try {
      setError("");
      setStatus("Recording... release to send");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      if (!pointerIsDownRef.current) {
        stopMicStream();
        setStatus("Hold to talk to your AI mentor");
        return;
      }

      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Recorder error:", event.error?.message || "Unknown recorder error");
      };

      recorder.onstop = () => {
        void handleRecorderStop(recorder.mimeType || mimeType || "audio/webm");
      };

      recorder.start(100);
      setIsRecording(true);
    } catch (recordError) {
      console.error("Microphone access failed:", recordError.message);
      setStatus("Microphone unavailable");
      setError("Microphone permission is required for voice mentor.");
      stopMicStream();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.stop();
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    pointerIsDownRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    void startRecording();
  };

  const onPointerUp = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.preventDefault();
    pointerIsDownRef.current = false;
    stopRecording();
  };

  const onPointerCancel = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerIsDownRef.current = false;
    stopRecording();
  };

  return (
    <section className="section-shell mb-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-main">AI Mentor Voice</p>
          <p className="text-xs text-muted">{status}</p>
        </div>
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerCancel}
          disabled={isProcessing}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            isRecording
              ? "bg-red-600 text-white"
              : isProcessing
                ? "btn-secondary cursor-not-allowed opacity-70"
                : "btn-primary"
          }`}
        >
          {isRecording ? "Release to Send" : isProcessing ? "Processing..." : "Hold to Talk"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-300">{error}</p>
      ) : null}

      <audio ref={audioRef} controls className="mt-3 w-full" />
    </section>
  );
}
