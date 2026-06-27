import { useEffect, useRef, useState } from "react";
import { useLocation, matchPath } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import axiosInstance from "../api/axiosInstance";
import { useAuthContext } from "../context/AuthContext";

const createAssistantMessage = (content) => ({ role: "assistant", content });
const createUserMessage = (content) => ({ role: "user", content });

export default function FloatingChatbot() {
  const { mongoUser } = useAuthContext();
  const location = useLocation();
  
  // Track state
  const [isOpen, setIsOpen] = useState(false);
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [messages, setMessages] = useState([
    createAssistantMessage(
      `Hello ${mongoUser?.name || "there"}! I'm your career advisor. Ask me anything about matching roles, cold outreach drafts, or optimizing your resume fit.`
    ),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentJob, setCurrentJob] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [replyMode, setReplyMode] = useState("audio");
  const [voicePreference, setVoicePreference] = useState("female");
  const [hasInterviewStarted, setHasInterviewStarted] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Detect active job if user is on the /job/:id route
  const match = matchPath({ path: "/job/:id" }, location.pathname);
  const activeJobId = match?.params?.id;

  useEffect(() => {
    if (activeJobId) {
      axiosInstance.get(`/api/jobs/${activeJobId}`)
        .then((res) => {
          setCurrentJob(res.data.job);
          // Add a context message when entering a job details page
          setMessages((current) => {
            // Avoid adding duplicate entry messages
            const lastMsg = current[current.length - 1];
            if (lastMsg && lastMsg.content.includes(res.data.job.title)) return current;
            return [
              ...current,
              createAssistantMessage(
                `I see you are viewing: "${res.data.job.title}" at ${res.data.job.company}. Ask me how your profile fits this role or let's draft an outreach message!`
              ),
            ];
          });
        })
        .catch((err) => {
          console.error("[FloatingChatbot] Failed to fetch job details:", err.message);
          setCurrentJob(null);
        });
    } else {
      setCurrentJob(null);
    }
  }, [activeJobId]);

  // Scroll to bottom whenever messages change or chatbot opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const playAudioReply = (audioUrl) => {
    if (!audioUrl || typeof window === "undefined") return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      void audio.play();
    } catch (err) {
      console.error("[FloatingChatbot] Failed to play interview audio:", err.message);
    }
  };

  const startMockInterview = async () => {
    if (loading || hasInterviewStarted) return;

    setHasInterviewStarted(true);
    setReplyMode("audio");
    setIsInterviewMode(true);
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post("/api/chat/mentor", {
        jobId: currentJob?._id || currentJob?.externalId || null,
        message: "Start a mock interview for this role and ask me the first interview question.",
        chatHistory: messages.slice(-10),
        replyMode: "audio",
        voicePreference,
      });

      const replyText = response.data?.reply || "Let's begin. Please tell me why you are interested in this role.";
      const activeInterview = response.data?.isInterviewMode === true;
      setIsInterviewMode(activeInterview);
      setMessages((current) => [...current, createAssistantMessage(replyText)]);

      if (activeInterview && response.data?.audioUrl) {
        setLastAudioUrl(response.data.audioUrl);
        playAudioReply(response.data.audioUrl);
      }
    } catch (err) {
      console.error("[FloatingChatbot] Mock interview start error:", err.message);
      setError(err.response?.data?.error || "Unable to start the mock interview.");
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async (text) => {
    if (!text.trim()) return;
    const userMsg = createUserMessage(text.trim());
    const updatedHistory = [...messages, userMsg].slice(-10); // Keep last 10 messages for context

    setMessages((current) => [...current, userMsg]);
    setInputValue("");
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post("/api/chat/mentor", {
        jobId: currentJob?._id || currentJob?.externalId || null,
        message: userMsg.content,
        chatHistory: updatedHistory,
        replyMode,
        voicePreference,
      });

      const replyText = response.data?.reply || "I couldn't get a response right now. Please try again.";
      const activeInterview = response.data?.isInterviewMode === true;
      setIsInterviewMode(activeInterview);

      setMessages((current) => [...current, createAssistantMessage(replyText)]);

      if (replyMode === "audio" && activeInterview && response.data?.audioUrl) {
        setLastAudioUrl(response.data.audioUrl);
        playAudioReply(response.data.audioUrl);
      }
    } catch (err) {
      console.error("[FloatingChatbot] Mentor chat error:", err.message);
      setError(err.response?.data?.error || "Unable to reach the career advisor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const populateVoices = () => {
      if (window.speechSynthesis?.getVoices) {
        window.speechSynthesis.getVoices();
      }
    };

    populateVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", populateVoices);

    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", populateVoices);
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      if (transcript) {
        setInputValue(transcript);
      }

      const hasFinalTranscript = Array.from(event.results).some((result) => result.isFinal);
      if (hasFinalTranscript && transcript) {
        recognition.stop();
        setIsListening(false);
        void sendChat(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("[FloatingChatbot] Voice recognition error:", event.error);
      setError(event.error === "not-allowed" ? "Microphone access was blocked." : "Voice input failed. Please try again.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const handleVoiceToggle = () => {
    if (loading) return;

    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setError("");
    setInputValue("");
    setIsListening(true);
    recognition.start();
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    await sendChat(inputValue);
  };

  const handleSuggestionClick = async (suggestion) => {
    await sendChat(suggestion);
  };

  if (!mongoUser || mongoUser.role !== "student") return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* FLOATING CHAT BUTTON */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all focus:outline-none"
        title="Chat with InternVue AI Advisor"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isOpen ? "close" : "chat"}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {isOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>

      {/* FLOATING WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50, x: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed bottom-24 right-6 ${isInterviewMode ? "w-[760px]" : "w-96"} max-w-[calc(100vw-2rem)] h-[550px] max-h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden`}
          >
            
            {/* Header */}
            <div className={`bg-gradient-to-r ${isInterviewMode ? "from-emerald-600 to-teal-600" : "from-blue-600 to-indigo-600"} px-5 py-4 flex items-center justify-between text-white border-b border-white/10 shrink-0 transition-all duration-300 z-20 shadow-md`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/12 border border-white/10">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v4M6 7v6a6 6 0 0012 0V7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">{isInterviewMode ? "Mock Interview Mode" : "Career Advisor"}</h3>
                  <p className="text-[11px] text-white/80 mt-0.5">{isInterviewMode ? "Active Interview Session — audio questions" : "Groq-powered Assistant — text & audio"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isInterviewMode) {
                      setReplyMode("text");
                      setIsInterviewMode(false);
                    } else {
                      setReplyMode("audio");
                      setIsInterviewMode(true);
                      void startMockInterview();
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-all ${isInterviewMode ? "bg-white text-emerald-700" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                  title={isInterviewMode ? "Currently in Mock Interview mode" : "Currently in Normal Chat mode"}
                >
                  {isInterviewMode ? "Mock Interview" : "Normal Chat"}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {isInterviewMode && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/08 border-t border-white/5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyMode("text");
                    setIsInterviewMode(false);
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${!isInterviewMode ? "bg-white text-emerald-700 shadow-sm" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                >
                  Normal Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyMode("audio");
                    setIsInterviewMode(true);
                    void startMockInterview();
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${isInterviewMode ? "bg-white text-emerald-700 shadow-sm" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                >
                  Mock Interview
                </button>

                <div className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => setReplyMode("text")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${replyMode === "text" ? "bg-white text-emerald-700" : "text-white/80 hover:bg-white/10"}`}
                  >
                    Text reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyMode("audio")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${replyMode === "audio" ? "bg-white text-emerald-700" : "text-white/80 hover:bg-white/10"}`}
                  >
                    Audio reply
                  </button>
                </div>

                <div className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => setVoicePreference("female")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${voicePreference === "female" ? "bg-white text-emerald-700" : "text-white/80 hover:bg-white/10"}`}
                  >
                    Female voice
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoicePreference("male")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${voicePreference === "male" ? "bg-white text-emerald-700" : "text-white/80 hover:bg-white/10"}`}
                  >
                    Male voice
                  </button>
                </div>
              </div>
            )}

            {/* Main content: messages (left) and interview panel (right when active) */}
            <div className="h-full flex">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/40">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-white/5 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs border border-red-100 dark:border-red-500/20">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
              </div>

              {isInterviewMode && (
                <div className="w-80 border-l border-slate-200 dark:border-white/5 bg-white/5 dark:bg-slate-900/80 p-4 flex flex-col gap-3">
                  <h4 className="text-sm font-semibold">Interview Panel</h4>
                  <div className="flex-1 overflow-auto">
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">Current question:</p>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-100">
                      {messages.slice().reverse().find(m => m.role === 'assistant')?.content || 'Waiting for the first question...'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { if (lastAudioUrl) playAudioReply(lastAudioUrl); }}
                      disabled={!lastAudioUrl}
                      className={`flex-1 h-9 rounded-full ${lastAudioUrl ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      ▶ Play question
                    </button>
                    <button
                      type="button"
                      onClick={() => void startMockInterview()}
                      className="h-9 px-3 rounded-full bg-blue-600 text-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Suggestion tags if the thread is short */}
            {messages.length <= 3 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-1.5 shrink-0">
                {currentJob ? (
                  <>
                    <button
                      onClick={() => handleSuggestionClick(`Start a mock interview for "${currentJob.title}" at ${currentJob.company}`)}
                      className="text-[11px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 transition-all text-left font-semibold"
                    >
                      🎯 Start Mock Interview
                    </button>
                    <button
                      onClick={() => handleSuggestionClick(`Does my profile fit the requirements of "${currentJob.title}"?`)}
                      className="text-[11px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 transition-all text-left"
                    >
                      🔍 Does my profile fit?
                    </button>
                    <button
                      onClick={() => handleSuggestionClick(`Can you write a personalized cold outreach draft for "${currentJob.title}" at ${currentJob.company}?`)}
                      className="text-[11px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 transition-all text-left"
                    >
                      ✏️ Draft outreach email
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSuggestionClick("Start a general career mock interview")}
                      className="text-[11px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 transition-all text-left font-semibold"
                    >
                      🎯 Start Mock Interview
                    </button>
                    <button
                      onClick={() => handleSuggestionClick("Based on my resume, what tech roles/internships match my skills?")}
                      className="text-[11px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 transition-all text-left"
                    >
                      💼 What roles match my profile?
                    </button>
                    <button
                      onClick={() => handleSuggestionClick("Give me tips to find a Remote Software Developer Internship in India.")}
                      className="text-[11px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 transition-all text-left"
                    >
                      🌍 Search strategy tips
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Form input */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? "Listening... speak now" : replyMode === "audio" ? "Speak your answer or ask a question" : "Type your answer or ask a question"}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-full px-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={loading}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${isListening ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                title={isListening ? "Stop voice input" : "Speak your question"}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
