/**
 * voice.js - Nhận diện giọng nói tiếng Việt thêm việc nhanh
 */

let recognition = null;
let isRecording = false;

export function isSpeechSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startListening(onResult, onError, onEnd) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (onError) onError("Trình duyệt chưa hỗ trợ chuyển giọng nói thành văn bản.");
    return false;
  }

  try {
    recognition = new SpeechRec();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (onError) onError(event.error);
    };

    recognition.onend = () => {
      isRecording = false;
      if (onEnd) onEnd();
    };

    recognition.start();
    isRecording = true;
    return true;
  } catch (err) {
    if (onError) onError(err.message);
    return false;
  }
}

export function stopListening() {
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
  isRecording = false;
}
