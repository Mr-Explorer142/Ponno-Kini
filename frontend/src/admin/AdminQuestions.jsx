import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import {
    EmptyState,
    Loading,
    Notice,
    PageHeading,
    Pagination,
} from "./AdminShared";
import { formatDate } from "./AdminFormat";

export default function AdminQuestions() {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [answering, setAnswering] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadQuestions = useCallback(async (signal) => {
        try {
            const response = await api.get("/admin/questions", {
                params: { page },
                signal,
            });
            setQuestions(response.data.data ?? []);
            setMeta(response.data.meta ?? null);
            setError("");
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Customer questions could not be loaded.",
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(() => {
            if (!controller.signal.aborted) loadQuestions(controller.signal);
        });
        return () => controller.abort();
    }, [loadQuestions]);

    const submitAnswer = async (event, question) => {
        event.preventDefault();
        const answer = answers[question.id]?.trim();
        if (!answer) return;
        setAnswering(question.id);
        setError("");
        setNotice("");
        try {
            await api.patch(`/questions/${question.id}/answer`, { answer });
            setQuestions((current) => current.filter((item) => item.id !== question.id));
            setAnswers((current) => {
                const next = { ...current };
                delete next[question.id];
                return next;
            });
            setNotice("Your answer has been published.");
            setLoading(true);
            await loadQuestions();
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "The answer could not be saved.",
            );
        } finally {
            setAnswering(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeading
                title="Customer questions"
                description="Answer questions that are waiting for a response."
            />
            <Notice>{error}</Notice>
            <Notice variant="success">{notice}</Notice>
            {loading ? (
                <Loading label="Loading unanswered questions..." />
            ) : questions.length ? (
                <div className="space-y-4">
                    {questions.map((question) => (
                        <article key={question.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
                            <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="font-semibold">{question.product.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {question.user.name} · {question.user.email}
                                    </p>
                                </div>
                                <time className="text-xs text-muted-foreground">
                                    {formatDate(question.created_at)}
                                </time>
                            </header>
                            <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm">
                                {question.question}
                            </p>
                            <form onSubmit={(event) => submitAnswer(event, question)} className="space-y-3">
                                <label className="flex flex-col gap-2 text-sm font-medium">
                                    Your answer
                                    <textarea
                                        required
                                        maxLength={2000}
                                        rows={3}
                                        value={answers[question.id] ?? ""}
                                        onChange={(event) => setAnswers({
                                            ...answers,
                                            [question.id]: event.target.value,
                                        })}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                    />
                                </label>
                                <Button type="submit" disabled={answering === question.id}>
                                    <Send />
                                    {answering === question.id ? "Sending..." : "Publish answer"}
                                </Button>
                            </form>
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyState>There are no unanswered questions.</EmptyState>
            )}
            <Pagination
                meta={meta}
                page={page}
                setPage={(nextPage) => {
                    setLoading(true);
                    setPage(nextPage);
                }}
            />
        </div>
    );
}
