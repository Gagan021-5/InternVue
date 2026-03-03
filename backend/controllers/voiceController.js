import { Readable } from "stream";
import axios from "axios";

const MENTOR_VOICE_ID = process.env.ELEVENLABS_MENTOR_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_sts_v2";
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
const ELEVENLABS_TIMEOUT_MS = Number(process.env.ELEVENLABS_TIMEOUT_MS || 30000);

const mimeToExtension = (mimeType) => {
  if (!mimeType) return "webm";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
};

export const streamMentorVoice = async (req, res) => {
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: ELEVENLABS_API_KEY is missing." });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: "Audio blob is required in request body." });
  }

  const inputContentType = (req.headers["content-type"] || "audio/webm").split(";")[0].trim();
  const filename = `student-input.${mimeToExtension(inputContentType)}`;

  const formData = new FormData();
  formData.append("audio", new Blob([req.body], { type: inputContentType }), filename);
  formData.append("model_id", ELEVENLABS_MODEL_ID);

  const elevenLabsUrl =
    `https://api.elevenlabs.io/v1/speech-to-speech/${encodeURIComponent(MENTOR_VOICE_ID)}/stream` +
    `?output_format=${encodeURIComponent(ELEVENLABS_OUTPUT_FORMAT)}&optimize_streaming_latency=3`;

  let upstreamResponse;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), ELEVENLABS_TIMEOUT_MS);
  try {
    upstreamResponse = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: formData,
      signal: abortController.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "ElevenLabs request timed out." });
    }
    console.error("ElevenLabs request failed:", error.message);
    return res.status(502).json({ error: "Could not reach ElevenLabs." });
  }
  clearTimeout(timeoutId);

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    console.error("ElevenLabs error:", upstreamResponse.status, errorText);
    return res.status(upstreamResponse.status).json({
      error: "ElevenLabs speech-to-speech failed.",
      details: errorText || "Unknown ElevenLabs error",
    });
  }

  if (!upstreamResponse.body) {
    return res.status(502).json({ error: "ElevenLabs response had no stream body." });
  }

  const outputContentType = upstreamResponse.headers.get("content-type") || "audio/mpeg";
  res.status(200);
  res.setHeader("Content-Type", outputContentType);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const nodeReadable = Readable.fromWeb(upstreamResponse.body);

  req.on("close", () => {
    nodeReadable.destroy();
  });

  nodeReadable.on("error", (error) => {
    console.error("Streaming proxy error:", error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Voice stream interrupted." });
    } else {
      res.end();
    }
  });

  nodeReadable.pipe(res);
};

export const generateSpeech = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const VOICE_ID = process.env.ELEVENLABS_TTS_VOICE_ID || "pNInz6obpgDQGcFmaJcg"; // Default: Adam
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: "Server misconfiguration: ELEVENLABS_API_KEY is missing." });
    }

    const headers = {
      "Accept": "audio/mpeg",
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    };

    const payload = {
      text: text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      }
    };

    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      data: payload,
      headers: headers,
      responseType: "stream"
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    response.data.pipe(res);

  } catch (error) {
    console.error("ElevenLabs TTS Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to generate speech"
    });
  }
};

