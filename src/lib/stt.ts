import { SpeechClient } from "@google-cloud/speech";

let _client: SpeechClient | null = null;

function getClient(): SpeechClient {
  if (_client) return _client;
  _client = new SpeechClient();
  return _client;
}

const ENCODING_MAP: Record<string, "WEBM_OPUS" | "OGG_OPUS" | "MP3" | "FLAC" | "LINEAR16"> = {
  "audio/webm": "WEBM_OPUS",
  "audio/webm;codecs=opus": "WEBM_OPUS",
  "audio/ogg": "OGG_OPUS",
  "audio/ogg;codecs=opus": "OGG_OPUS",
  "audio/mpeg": "MP3",
  "audio/mp3": "MP3",
  "audio/flac": "FLAC",
  "audio/wav": "LINEAR16",
  "audio/wave": "LINEAR16",
  "audio/x-wav": "LINEAR16",
};

export async function transcribeAudio(
  audio: Buffer,
  mime: string,
  languageCode = "vi-VN",
): Promise<string> {
  const encoding = pickEncoding(mime);
  const client = getClient();

  // Long audio (>60s) must be processed via long-running recognize. We
  // dispatch by buffer length: ~1 MiB ≈ 1 min of opus audio.
  const useLongRunning = audio.byteLength > 1_000_000;

  const config: any = {
    languageCode,
    enableAutomaticPunctuation: true,
    model: "latest_long",
    audioChannelCount: 1,
    enableSpokenPunctuation: { value: true },
  };
  if (encoding) config.encoding = encoding;

  const request: any = {
    audio: { content: audio.toString("base64") },
    config,
  };

  if (useLongRunning) {
    const [op] = await client.longRunningRecognize(request);
    const [resp] = await op.promise();
    return joinResults(resp);
  }
  const [resp] = await client.recognize(request);
  return joinResults(resp);
}

function joinResults(resp: any): string {
  return (resp.results || [])
    .map((r: any) => r.alternatives?.[0]?.transcript || "")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function pickEncoding(mime: string): string | undefined {
  const key = mime.toLowerCase().split(";")[0].trim();
  for (const [k, v] of Object.entries(ENCODING_MAP)) {
    if (k.split(";")[0] === key) return v;
  }
  return undefined; // Let Google auto-detect
}
