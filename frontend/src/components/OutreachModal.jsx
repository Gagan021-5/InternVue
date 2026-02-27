import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../api/axiosInstance";

export default function OutreachModal({ isOpen, onClose, job }) {
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && job) {
            setLoading(true);
            setDraft("");
            setCopied(false);
            setError("");

            const generate = async () => {
                try {
                    const res = await axiosInstance.post(`/api/user/jobs/${job.jobId}/generate-outreach`);
                    setDraft(res.data.draft);
                } catch (err) {
                    setError(err.response?.data?.error || "Failed to generate outreach.");
                } finally {
                    setLoading(false);
                }
            };

            generate();
        }
    }, [isOpen, job]);

    const handleCopy = () => {
        if (!draft) return;
        navigator.clipboard.writeText(draft);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-[#030712]/60"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#030712]/80 md:p-8"
                    >
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                    ✨ AI Outreach Draft
                                </h2>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    For {job?.jobData?.title || "Role"} at {job?.jobData?.company || "Company"}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex h-64 flex-col items-center justify-center space-y-4">
                                <div className="relative flex h-16 w-16 items-center justify-center">
                                    <div className="absolute h-full w-full animate-ping rounded-full border-4 border-blue-500 opacity-20"></div>
                                    <div className="h-10 w-10 animate-pulse rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30"></div>
                                </div>
                                <p className="animate-pulse font-semibold text-blue-600 dark:text-blue-400">
                                    Crafting your perfect pitch...
                                </p>
                            </div>
                        ) : error ? (
                            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
                                <p className="font-semibold text-red-600 dark:text-red-400">{error}</p>
                                <button
                                    onClick={onClose}
                                    className="mt-4 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <textarea
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    className="h-64 w-full resize-none rounded-2xl border border-slate-200 bg-white/50 p-4 text-sm text-slate-700 shadow-inner outline-none backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:focus:border-blue-500/50 dark:focus:bg-black/20"
                                />

                                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-white/10">
                                    <button
                                        onClick={onClose}
                                        className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all ${copied
                                                ? "bg-emerald-500 shadow-emerald-500/30"
                                                : "bg-blue-600 shadow-blue-600/30 hover:bg-blue-500"
                                            }`}
                                    >
                                        {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
