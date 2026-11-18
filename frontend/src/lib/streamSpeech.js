const saved = new Map();
export function playSpeech(text, onEnd, onError) {
  const context = new AudioContext();
  const abort = new AbortController();
  let stopped = false;
  let next = 0;
  let timer;
  function stop() {
    if (stopped) return;
    stopped = true;
    abort.abort();
    clearTimeout(timer);
    context.close().catch(() => {});
  }
  function queue(chunk) {
    if (stopped) return;
    const bytes = Uint8Array.from(atob(chunk.data), c => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const buffer = context.createBuffer(1, bytes.length / 2, chunk.sample_rate || 24000);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    next = Math.max(next, context.currentTime + 0.06);
    source.start(next);
    next += buffer.duration;
  }
  async function run() {
    await context.resume();
    const chunks = saved.get(text) || [];
    if (chunks.length) chunks.forEach(queue);
    else {
      const response = await fetch("/api/chat/speech-stream", {
        method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include",
        body:JSON.stringify({text}), signal:abort.signal
      });
      if (!response.ok) {
        const error = new Error("Speech unavailable");
        error.code = response.status === 429 ? "SPEECH_QUOTA" : "SPEECH_UNAVAILABLE";
        throw error;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "", complete = false;
      while (true) {
        const {value,done} = await reader.read();
        if (done) break;
        pending += decoder.decode(value,{stream:true});
        let end;
        while ((end = pending.indexOf("\n")) >= 0) {
          const chunk = JSON.parse(pending.slice(0,end));
          pending = pending.slice(end+1);
          if (chunk.error) throw new Error("Speech interrupted");
          if (chunk.done) complete = true;
          if (chunk.data) { chunks.push(chunk); queue(chunk); }
        }
      }
      if (!complete || !chunks.length) throw new Error("Incomplete speech");
      if (saved.size >= 20) saved.delete(saved.keys().next().value);
      saved.set(text,chunks);
    }
    if (!stopped) timer = setTimeout(() => { stop(); onEnd(); }, Math.max(0,(next-context.currentTime)*1000));
  }
  run().catch(error => { if (!stopped) { stop(); onError(error); } });
  return {pause:stop};
}
