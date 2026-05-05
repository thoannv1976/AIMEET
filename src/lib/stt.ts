import speech, { v1, v2 } from "@google-cloud/speech";

const V2_LOCATION = process.env.STT_V2_LOCATION || "asia-southeast1";
const V2_MODEL = process.env.STT_V2_MODEL || "chirp_2";

let _v1: v1.SpeechClient | null = null;
let _v2: v2.SpeechClient | null = null;

function getV1(): v1.SpeechClient {
  if (_v1) return _v1;
  _v1 = new speech.SpeechClient();
  return _v1;
}

function getV2(): v2.SpeechClient {
  if (_v2) return _v2;
  // v2 endpoints are region-pinned. Using the regional endpoint is required
  // when calling a recognizer in that region (e.g. chirp_2 in asia-southeast1).
  const apiEndpoint =
    V2_LOCATION === "global"
      ? "speech.googleapis.com"
      : `${V2_LOCATION}-speech.googleapis.com`;
  _v2 = new speech.v2.SpeechClient({ apiEndpoint });
  return _v2;
}

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

function getProjectId(): string {
  const id =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;
  if (!id) throw new Error("FIREBASE_PROJECT_ID is not set");
  return id;
}

function joinResults(resp: any): string {
  return (resp.results || [])
    .map((r: any) => r.alternatives?.[0]?.transcript || "")
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function transcribeWithV2(
  audio: Buffer,
  languageCode: string,
): Promise<string> {
  const client = getV2();
  const projectId = getProjectId();
  const request: any = {
    recognizer: `projects/${projectId}/locations/${V2_LOCATION}/recognizers/_`,
    config: {
      autoDecodingConfig: {},
      languageCodes: [languageCode],
      model: V2_MODEL,
      features: { enableAutomaticPunctuation: true },
    },
    content: audio.toString("base64"),
  };
  const [response] = await client.recognize(request);
  return joinResults(response);
}

async function transcribeWithV1(
  audio: Buffer,
  mime: string,
  languageCode: string,
): Promise<string> {
  const client = getV1();
  const encoding = pickEncoding(mime);
  const config: any = {
    languageCode,
    enableAutomaticPunctuation: true,
    model: "latest_long",
    useEnhanced: true,
  };
  if (encoding) config.encoding = encoding;
  const request = { audio: { content: audio.toString("base64") }, config };
  const [op] = await client.longRunningRecognize(request);
  const [response] = await op.promise();
  return joinResults(response);
}

function pickEncoding(mime: string): string | undefined {
  const key = mime.toLowerCase().split(";")[0].trim();
  return ENCODING_MAP[key];
}

// v2 sync recognize accepts inline audio up to ~10 MiB / ~60 s. We use ~2 MiB
// (~62 s of 16-kHz 16-bit mono LINEAR16) as a safe threshold.
const V2_INLINE_LIMIT_BYTES = 2_000_000;

export async function transcribeAudio(
  audio: Buffer,
  mime: string,
  languageCode = "vi-VN",
): Promise<string> {
  const eligibleForV2 = audio.byteLength <= V2_INLINE_LIMIT_BYTES;

  if (eligibleForV2) {
    try {
      const text = await transcribeWithV2(audio, languageCode);
      if (text) return text;
      // chirp_2 returned no results — fall through to v1 in case the audio
      // was just below the model's confidence threshold.
    } catch (e: any) {
      // Region/model not enabled, quota, etc. — degrade gracefully.
      console.warn("[stt] v2 chirp_2 failed, falling back to v1:", e?.message || e);
    }
  }
  return transcribeWithV1(audio, mime, languageCode);
}
