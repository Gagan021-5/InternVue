import { useMemo, useState } from "react";
import axiosInstance from "../api/axiosInstance";

const createAssistantMessage = (content) => ({ role: "assistant", content });
const createUserMessage = (content) => ({ role: "user", content });

export default function JobChatPanel({ job }) {
  const [messages, setMessages] = useState([
    createAssistantMessage(
      "Hi there! Ask me anything about this internship role, and I can also draft a recruiter-ready outreach email for you."
    ),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lastMessages = useMemo(() => messages.slice(-10), [messages]);

  const sendChat = async (userText) => {
    if (!userText.trim()) return;
    const userMessage = createUserMessage(userText.trim());
    const updatedMessages = [...lastMessages, userMessage];
    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post(
        `/api/user/jobs/${job._id || job.externalId}/chat`,
        { messages: updatedMessages }
      );
      const reply = response.data?.reply || "I couldn't generate a response right now. Please try again.";
      setMessages((current) => [...current, createAssistantMessage(reply)]);
    } catch (err) {
      console.error("Job chat error:", err.message);
      setError(err.response?.data?.error || "Unable to get a chat response.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    await sendChat(inputValue);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await handleSend();
  };

  const handleGenerateOutreach = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post(
        `/api/user/jobs/${job._id || job.externalId}/generate-outreach`
      );
      const draft = response.data?.draft || "";
      setMessages((current) => [
        ...current,
        createAssistantMessage(
          `Here is a customized outreach email for this role:\n\n${draft}`
        ),
      ]);
    } catch (err) {
      console.error("Outreach generation error:", err.message);
      setError(err.response?.data?.error || "Failed to generate outreach draft.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-shell p-6 bg-white/80 dark:bg-slate-900/75 border border-slate-200/60 dark:border-white/5 rounded-3xl shadow-xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Role Chat Assistant</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ask questions about this internship role or let me draft a recruiter outreach message.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateOutreach}
          disabled={loading}
          className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Draft outreach
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-3xl border border-slate-200/70 bg-slate-50 p-4 text-sm text-slate-700 shadow-inner dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-200">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`mb-4 rounded-3xl p-3 ${
              message.role === "assistant"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "bg-blue-600 text-white dark:bg-blue-700"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Ask about the role, responsibilities, skills fit, or recruiter outreach..."
          className="w-full min-h-[100px] rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
        />

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Tip: press Enter to send.
          </span>
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="btn-primary rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Thinking..." : "Send message"}
          </button>
        </div>
      </form>
    </div>
  );
}
