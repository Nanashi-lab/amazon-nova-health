/**
 * AudioWorklet processor for capturing raw PCM audio at 16kHz.
 * Runs in a separate audio thread -- plain JS (not TypeScript).
 * Converts Float32 samples to Int16 and posts to main thread.
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, params) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const float32 = input[0]; // mono channel
    const int16 = new Int16Array(float32.length);

    for (let i = 0; i < float32.length; i++) {
      const s = float32[i];
      int16[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
    }

    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
