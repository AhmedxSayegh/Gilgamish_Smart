import { playSpeech } from "../lib/streamSpeech";
import { arabicSpeechText } from "../lib/arabicSpeech";
import { bookingToday, earliestEnd } from "../../../shared/chatDates.mjs";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../lib/context";
import { api } from "../lib/api";
import { TravelInput } from "./UI";
import { CityField } from "../pages/Planner";
import "./HomeChat.css";

export function HomeChat() {
  const { t, language } = useApp();
  const [messages, setMessages] = useState([]), [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(null), context = useRef({}), log = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, busy]);

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  useEffect(() => { synth?.getVoices(); }, [synth]);
  const mic = useRef(null), readReplies = useRef(false);
  const [listening, setListening] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  useEffect(() => () => {
    if (mic.current) {
      mic.current.onend = mic.current.onerror = mic.current.onresult = null;
      mic.current.abort();
      mic.current = null;
    }
    synth?.cancel();
    currentSpeech.current?.pause?.();
    currentSpeech.current = null;
  }, [language, synth]);
  useEffect(() => { setListening(false); setVoiceError(""); }, [language]);
  function record() {
    if (mic.current) { mic.current.stop(); return; }
    const session = new Recognition();
    session.lang = language === "ar" ? "ar-SA" : "en-US";
    let voiceMessage = "";
    session.onresult = event => {
      const words = event.results[0][0].transcript.trim();
      if (words) {
        voiceMessage = [draft.trim(), words].filter(Boolean).join(" ").slice(0,600);
        setDraft(voiceMessage);
      }
    };
    session.onerror = event => {
      voiceMessage = "";
      setVoiceError(event.error === "not-allowed" ? t("Allow microphone access to dictate.", "اسمح باستخدام الميكروفون للإملاء.")
        : t("Voice input failed. Try again or type your message.", "تعذّر التقاط الصوت. حاول مجدداً أو اكتب رسالتك."));
    };
    session.onend = () => {
      mic.current = null;
      setListening(false);
      if (voiceMessage) send(null, undefined, voiceMessage);
    };
    stopReading();
    setVoiceError("");
    try { session.start(); mic.current = session; setListening(true); }
    catch { setVoiceError(t("Could not start the microphone.", "تعذّر تشغيل الميكروفون.")); }
  }
  const currentSpeech = useRef(null);
  const [reading, setReading] = useState(null);
  function stopReading() {
    currentSpeech.current?.pause?.();
    currentSpeech.current = null;
    setReading(null);
    synth?.cancel();
  }
  function speak(reply) {
    if (!reply?.answer) return;
    stopReading();
    setReading(reply);
    setVoiceError("");
    const player = playSpeech(arabicSpeechText(reply.answer),
      () => { if (currentSpeech.current === player) stopReading(); },
      (error) => {
        if (currentSpeech.current === player) {
          stopReading();
          setVoiceError(error?.code === "SPEECH_QUOTA"
            ? t("The voice service request limit has been reached. Please try later.", "وصلت خدمة الصوت لحدّ الطلبات المسموح. حاول لاحقاً.")
            : t("Could not play audio. Tap the speaker to retry.", "تعذّر تشغيل الصوت. اضغط السماعة للمحاولة مجدداً."));
        }
      });
    currentSpeech.current = player;
  }
  function toggleSpeech() {
    readReplies.current = !readReplies.current;
    setSpoken(readReplies.current);
    if (!readReplies.current) stopReading();
    else if (!busy && !listening) speak(messages.filter(item => !item.user).at(-1));
  }
  async function send(event, quoteSubmit, voiceMessage) {
    event?.preventDefault();
    const message = quoteSubmit ? t("Search prices", "ابحث عن الأسعار") : (voiceMessage ?? draft.trim());
    if (!message || request.current || mic.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setDraft("");
    setMessages(items => [...items, { user: true, answer: message }]);
    try {
      const history = messages.slice(-4).map(m => ({ role: m.user ? "user" : "assistant", text: m.answer.slice(0,1200) }));
      const response = await api("/chat", { method: "POST", body: { message, language, history, quoteSubmit, context: context.current }, signal: controller.signal });
      context.current = response.context;
      setMessages(items => [...items, response]);

      if (voiceMessage || readReplies.current) speak(response);
    } catch (e) {
      if (controller.signal.aborted) return;
      const answer = e.status === 429 ? t("Please wait a minute before sending again.", "انتظر دقيقة قبل إرسال سؤال آخر.") :
        t("Couldn’t send your question. Please try again.", "تعذّر إرسال سؤالك. جرّب مرة أخرى.");
      setMessages(items => [...items, { answer }]);
      setDraft(message);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return <section className="quick-plan home-chat" aria-labelledby="home-chat-title">
    <h2 id="home-chat-title">{t("Ask Gilgamish", "اسأل جلجامش")}</h2>
    <div className="chat-log" role="log" aria-live="polite" ref={log}>
      {!messages.length && <p>{t("Which place would you like to explore? You can also ask how to use Gilgamish.", "عن أي مكان حابب تعرف أكتر؟ فيك كمان تسأل كيف تستخدم جلجامش.")}</p>}
      {messages.map((m, i) => <div className={m.user ? "chat-turn user-turn" : "chat-turn"} key={i}>
        <div className="chat-reply-line"><p dir="auto">{m.answer}</p>
          {!m.user && <button type="button" className="reply-audio" aria-pressed={reading === m}
            aria-label={reading === m ? t("Stop reading this reply", "إيقاف قراءة الرد") : t("Listen to this reply", "استمع لهذا الرد")}
            title={reading === m ? t("Stop", "إيقاف") : t("Listen", "استماع")} onClick={() => reading === m ? stopReading() : speak(m)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {reading === m ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/> : <><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>}
            </svg>
          </button>}
        </div>
        {m.link?.href?.startsWith("/") && !m.link.href.startsWith("//") ? <Link to={m.link.href}>{m.link.label}</Link> :
          m.link?.href?.startsWith("https://") && <a href={m.link.href} target="_blank" rel="noreferrer">{m.link.label} ↗</a>}
      </div>)}
      {busy && <div role="status" className="chat-typing" aria-label={t("Gilgamish is typing", "جلجامش يكتب")}>
        <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
      </div>}
    </div>
    {context.current?.quote && <QuoteFields key={JSON.stringify(context.current)} quote={context.current.quote} expanded={context.current.openFlightForm} t={t} send={send} busy={busy}/>}
    <form onSubmit={send}>
      <input aria-label={t("Your question", "سؤالك")} maxLength={600} dir="auto" placeholder={t("Ask a question…", "اكتب سؤالك…")} value={draft} readOnly={listening} onChange={e => setDraft(e.target.value)} />
      <button type="button" className="chat-mic" disabled={!Recognition || busy} aria-pressed={listening}
        aria-label={listening ? t("Stop recording", "إيقاف التسجيل") : t("Record a message", "تسجيل رسالة")}
        title={listening ? t("Stop recording", "إيقاف التسجيل") : t("Record a message", "تسجيل رسالة")} onClick={record}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          {listening ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/> : <>
            <rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6"/>
          </>}
        </svg>
      </button>
      <button className="button" disabled={busy || listening || !draft.trim()}>{t("Send", "إرسال")}</button>
    </form>
    <div className="chat-voice-controls"><button type="button" className="button secondary small" disabled={false} aria-pressed={spoken} onClick={toggleSpeech}>{spoken ? t("Mute replies", "كتم الردود") : t("Read replies aloud", "قراءة الردود بصوت")}</button></div>
    {(voiceError || !Recognition) && <small role="status">{voiceError || t("Voice input is unavailable in this browser.", "الإدخال الصوتي غير متاح في هذا المتصفح.")}</small>}
  </section>;
}

function QuoteFields({quote, expanded, t, send, busy}) {
  const [values,setValues]=useState(quote);
  const today = bookingToday();
  const flight=values.kind==="flights";
  const change=(key,value)=>setValues(old=>({...old,[key]:value}));
  function airportField(key,label) {
    const value = values[key];
    return <CityField airportMode label={label} name={value} code={/^[A-Z]{3}$/.test(value) ? value : ""} onChange={(name,code)=>change(key, code || name)} />;
  }
  function field(key,label,type="text",required=true) {
    return <label>{label}<TravelInput type={type} value={values[key] || (key==="children" ? 0 : "")}
      required={required} min={type==="date" ? (key==="startDate" ? today : earliestEnd(values.startDate, today)) : type==="number" ? (key==="adults"?1:0) : undefined} max={type==="number"?9:undefined}
      maxLength={type==="text"?100:undefined}
      onChange={e=>change(key,type==="number"?Number(e.target.value):e.target.value)}/></label>;
  }
  return <details className="quote-fields" open={expanded}><summary>{t("Enter search details","إدخال تفاصيل البحث")}</summary>
    <form onSubmit={e=>send(e,values)}>
      {flight && airportField("origin",t("From","من"))}
      {flight ? airportField("destination",t("To","إلى")) : field("destination",t("City","المدينة"))}
      {!flight && field("hotelName",t("Hotel name (optional)","اسم الفندق (اختياري)"),"text",false)}
      {flight && <label>{t("Journey","نوع الرحلة")}<select required value={values.journey} onChange={e=>change("journey",e.target.value)}>
        <option value="">{t("Choose","اختر")}</option><option value="oneway">{t("One way","ذهاب فقط")}</option><option value="roundtrip">{t("Round trip","ذهاب وعودة")}</option>
      </select></label>}
      {field("startDate",flight?t("Departure","المغادرة"):t("Check-in","الدخول"),"date")}
      {(!flight || values.journey==="roundtrip") && field("endDate",flight?t("Return","العودة"):t("Check-out","الخروج"),"date")}
      {field("adults",t("Adults","البالغون"),"number")}{field("children",t("Children","الأطفال"),"number")}
      <label>{t("Currency","العملة")}<select value={values.currency} onChange={e=>change("currency",e.target.value)}>
       {["SAR","USD","EUR","GBP","AED","TRY"].map(c=><option key={c}>{c}</option>)}</select></label>
      <button className="button" disabled={busy}>{t("Search prices","بحث عن الأسعار")}</button>
    </form>
  </details>;
}
