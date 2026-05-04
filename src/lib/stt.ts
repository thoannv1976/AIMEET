import { SpeechClient } from "@google-cloud/speech";

let _client: SpeechClient | null = null;

function getClient(): SpeechClient {
  if (_client) return _client;
  _client = new SpeechClient();
  return _client;
}

// Map common browser MIME types to the Google STT v1 encoding enum.
// Anything we don't recognise is left unset so Google can auto-detect from
// container headers (works for OGG/WEBM/FLAC/WAV).
const ENCODING_MAP: Record<string, string> = {
  "audio/webm": "WEBM_OPUS",
  "audio/ogg": "OGG_OPUS",
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
  const client = getClient();
  const encoding = pickEncoding(mime);

  const config: any = {
    languageCode,
    enableAutomaticPunctuation: true,
  };
  if (encoding) config.encoding = encoding;
  // Note: for WEBM_OPUS / OGG_OPUS the sample rate is read from the
  // container header so we omit sampleRateHertz. For LINEAR16 the WAV
  // header carries it. We also DO NOT set audioChannelCount — letting
  // Google match whatever the actual stream contains.

  const request = { audio: { content: audio.toString("base64") }, config };

  // longRunningRecognize works for everything from a few seconds up to
  // ~8 hours and avoids the 60-second sync limit. Polling overhead is a
  // few seconds, which is acceptable in our UX.
  const [op] = await client.longRunningRecognize(request);
  const [resp] = await op.promise();

  return (resp.results || [])
    .map((r: any) => r.alternatives?.[0]?.transcript || "")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function pickEncoding(mime: string): string | undefined {
  const key = mime.toLowerCase().split(";")[0].trim();
  return ENCODING_MAP[key];
}
