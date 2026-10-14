"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  Cpu,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  ShieldAlert,
  UploadCloud,
  RefreshCw,
  Search,
  Copy,
  Check,
  Clock,
  Layers,
  HelpCircle,
  History,
  UserCheck,
  Send,
} from "lucide-react";
import { listProjectsApi } from "@/lib/api/projects";
import type { Project } from "@/types";

// ============================================================================
// Types matching Server Contract (POST /api/v1/qc/jobs & GET /api/v1/qc/jobs/[id])
// ============================================================================

export type QCJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "REVIEW_REQUIRED" | "FAILED";
export type QCOverallOutcome = "PASS" | "FAIL" | "REVIEW" | null;
export type ReviewDecision = "ACCEPTED" | "REJECTED" | "NEEDS_CLARIFICATION";

export interface SanitizedReviewRecord {
  id: string;
  job_id: string;
  version: number;
  decision: ReviewDecision;
  notes: string | null;
  observation_decisions: Record<string, unknown> | null;
  idempotency_key: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export interface EvidenceCoordinates {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface CandidateObservation {
  observation_id: string;
  page_number: number;
  component_id?: string;
  connector_id?: string;
  pin_id?: string;
  wire_id?: string;
  wire_gauge?: string;
  wire_color?: string;
  source_terminal?: string;
  destination_terminal?: string;
  coordinates?: EvidenceCoordinates;
  observed_text: string;
  confidence_score: number;
  confidence_level?: string;
  ambiguity_reasons: string[];
  requires_human_review: boolean;
}

export interface DeterministicRuleFinding {
  finding_id: string;
  rule_id: string;
  rule_name: string;
  standard_reference: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  outcome: "PASS" | "FAIL" | "REVIEW";
  title: string;
  reason: string;
  evidence_observation_ids: string[];
  coordinates?: EvidenceCoordinates;
  human_review_required: boolean;
}

export interface QCReport {
  report_id: string;
  document_name: string;
  sha256_hash: string;
  standard: string;
  created_at: string;
  model_used: string;
  overall_outcome: "PASS" | "FAIL" | "REVIEW";
  specification_is_complete: boolean;
  extraction_is_verified: boolean;
  scope_description: string | null;
  rule_findings: DeterministicRuleFinding[];
  candidate_observations: CandidateObservation[];
  pages_rendered: string[];
  total_page_count: number;
  processed_page_count: number;
  failed_page_count: number;
  unprocessed_page_numbers: number[];
  failed_page_numbers: number[];
  is_experimental: boolean;
  disclaimer: string;
}

export interface PageCoverage {
  total_pages: number;
  processed_pages: number;
  failed_pages: number;
  unprocessed_page_numbers: number[];
  failed_page_numbers: number[];
}

export interface QCJobRecord {
  job_id: string;
  status: QCJobStatus;
  overall_outcome: QCOverallOutcome;
  document_name: string;
  document_sha256: string;
  standard: string;
  page_coverage: PageCoverage;
  report: QCReport | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  is_experimental: boolean;
  disclaimer: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

export default function LLMQCDemoPage() {
  // Project selection & context
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [standard, setStandard] = useState<string>("IPC/WHMA-A-620D");
  const [specComplete, setSpecComplete] = useState<boolean>(true);
  const [extractionVerified, setExtractionVerified] = useState<boolean>(false);
  const [netlistInput, setNetlistInput] = useState<string>("");

  // Job state
  const [currentJob, setCurrentJob] = useState<QCJobRecord | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [resumeJobInput, setResumeJobInput] = useState<string>("");

  // Interaction & UI status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingErrorCount, setPollingErrorCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"findings" | "candidates" | "review" | "coverage">("findings");
  const [hoveredCoord, setHoveredCoord] = useState<EvidenceCoordinates | null>(null);
  const [humanReviewChecks, setHumanReviewChecks] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Persisted Review State (Durable, Auditable, Versioned)
  const [reviewsHistory, setReviewsHistory] = useState<SanitizedReviewRecord[]>([]);
  const [latestReview, setLatestReview] = useState<SanitizedReviewRecord | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSaveSuccess, setReviewSaveSuccess] = useState<string | null>(null);
  const [reviewSaveError, setReviewSaveError] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecision | "">("");
  const [reviewNotes, setReviewNotes] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load available projects for caller tenant on mount
  useEffect(() => {
    let isMounted = true;
    listProjectsApi()
      .then((data) => {
        if (!isMounted) return;
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load tenant projects:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  // Clean up polling and in-flight fetch requests on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Review Fetcher: GET /api/v1/qc/jobs/[jobId]/review
  // --------------------------------------------------------------------------
  const loadReviews = useCallback(async (jobId: string) => {
    if (!jobId) return;
    setIsLoadingReviews(true);
    try {
      const res = await fetch(`/api/v1/qc/jobs/${encodeURIComponent(jobId)}/review`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const history: SanitizedReviewRecord[] = data.history || [];
        const latest: SanitizedReviewRecord | null = data.latest_review || null;
        setReviewsHistory(history);
        setLatestReview(latest);

        if (latest) {
          setSelectedDecision(latest.decision);
          setReviewNotes(latest.notes || "");
          if (latest.observation_decisions) {
            const obsMap: Record<string, boolean> = {};
            for (const [k, v] of Object.entries(latest.observation_decisions)) {
              obsMap[k] = typeof v === "boolean" ? v : !!(v as any)?.confirmed;
            }
            setHumanReviewChecks(obsMap);
          }
        }
      }
    } catch (err) {
      console.warn("[QC_REVIEWS_LOAD_ERROR] Failed to load reviews:", err);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Polling Engine: Polls GET /api/v1/qc/jobs/[jobId] safely without overlap
  // --------------------------------------------------------------------------
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      if (!jobId) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsPolling(true);

      try {
        const res = await fetch(`/api/v1/qc/jobs/${encodeURIComponent(jobId)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: abortControllerRef.current.signal,
        });

        if (res.status === 404) {
          setIsPolling(false);
          setErrorMessage("Job not found or access denied. Verify the Job ID and your tenant authorization.");
          return;
        }

        if (res.status === 401) {
          setIsPolling(false);
          setErrorMessage("Authentication session expired. Please log in again.");
          return;
        }

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          throw new Error(`Server returned HTTP ${res.status}: ${errorText.slice(0, 150)}`);
        }

        const jobData: QCJobRecord = await res.json();
        setCurrentJob(jobData);
        setPollingErrorCount(0);

        // Check if job has reached terminal state
        if (["COMPLETED", "REVIEW_REQUIRED", "FAILED"].includes(jobData.status)) {
          setIsPolling(false);
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          loadReviews(jobId);
          return;
        }

        // If still QUEUED or PROCESSING, schedule next poll tick (2.5 seconds)
        pollTimerRef.current = setTimeout(() => {
          pollJobStatus(jobId);
        }, 2500);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return; // Normal cleanup on abort
        }
        console.warn("[QC_UI_POLL_WARNING] Polling error:", err);
        setPollingErrorCount((prev) => {
          const next = prev + 1;
          if (next >= 5) {
            setIsPolling(false);
            setErrorMessage("Temporary network connectivity error while checking job status. You can resume checking at any time.");
          } else {
            // Retry with backoff
            pollTimerRef.current = setTimeout(() => {
              pollJobStatus(jobId);
            }, 3500);
          }
          return next;
        });
      }
    },
    [loadReviews]
  );

  // --------------------------------------------------------------------------
  // Document Submission: POST /api/v1/qc/jobs
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedProjectId) {
      setErrorMessage("Please select an active project before submitting a schematic.");
      return;
    }

    // Cancel existing poll loop if active
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    setIsSubmitting(true);
    setErrorMessage(null);
    setCurrentJob(null);
    setActiveJobId(null);
    setHumanReviewChecks({});
    setReviewsHistory([]);
    setLatestReview(null);
    setSelectedDecision("");
    setReviewNotes("");
    setReviewSaveSuccess(null);
    setReviewSaveError(null);

    // Generate unique client idempotency key to prevent accidental double-spend
    const idempotencyKey = crypto.randomUUID();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", selectedProjectId);
    formData.append("standard", standard);
    formData.append("specification_is_complete", String(specComplete));
    formData.append("extraction_is_verified", String(extractionVerified));
    formData.append("idempotency_key", idempotencyKey);

    if (netlistInput.trim()) {
      formData.append("expected_netlist_json", netlistInput.trim());
    }

    try {
      const res = await fetch("/api/v1/qc/jobs", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: formData,
      });

      if (!res.ok) {
        let errorDetail = `Submission failed (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          errorDetail = errJson.detail?.message || errJson.detail || errorDetail;
        } catch {
          const raw = await res.text().catch(() => "");
          if (raw) errorDetail = raw.slice(0, 200);
        }

        if (res.status === 401) {
          errorDetail = "Authentication required. Please log in with an authorized engineer account.";
        } else if (res.status === 402) {
          errorDetail = "Monthly QC check quota exceeded. Contact your organization administrator to upgrade plan.";
        } else if (res.status === 403) {
          errorDetail = "Forbidden: Your account role does not have permission to execute QC analysis jobs.";
        } else if (res.status === 413) {
          errorDetail = "File size exceeds the 25 MB document limit.";
        }

        throw new Error(errorDetail);
      }

      const submitData = await res.json();
      const jobId = submitData.job_id;
      setActiveJobId(jobId);
      setResumeJobInput(jobId);

      // Initialize lightweight job state from creation response
      setCurrentJob({
        job_id: jobId,
        status: submitData.status || "QUEUED",
        overall_outcome: null,
        document_name: submitData.document_name || file.name,
        document_sha256: submitData.document_sha256 || "Pending",
        standard: submitData.standard || standard,
        page_coverage: {
          total_pages: 1,
          processed_pages: 0,
          failed_pages: 0,
          unprocessed_page_numbers: [],
          failed_page_numbers: [],
        },
        report: null,
        error_message: null,
        created_at: submitData.created_at || new Date().toISOString(),
        updated_at: submitData.created_at || new Date().toISOString(),
        is_experimental: true,
        disclaimer: "EXPERIMENTAL PROOF OF CONCEPT",
      });

      // Begin safe background status polling
      pollJobStatus(jobId);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to submit document.");
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --------------------------------------------------------------------------
  // Resume / Lookup Existing Job
  // --------------------------------------------------------------------------
  const handleResumeJob = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = resumeJobInput.trim();
    if (!cleanId) return;

    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    setErrorMessage(null);
    setActiveJobId(cleanId);
    loadReviews(cleanId);
    pollJobStatus(cleanId);
  };

  const copyJobIdToClipboard = () => {
    if (!activeJobId) return;
    navigator.clipboard.writeText(activeJobId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const toggleReview = (obsId: string) => {
    setHumanReviewChecks((prev) => ({
      ...prev,
      [obsId]: !prev[obsId],
    }));
  };

  // --------------------------------------------------------------------------
  // Submit Human Review Decision to Server: POST /api/v1/qc/jobs/[jobId]/review
  // --------------------------------------------------------------------------
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobId) {
      setReviewSaveError("No active QC job selected.");
      return;
    }
    if (!selectedDecision) {
      setReviewSaveError("Please select an explicit review decision (ACCEPTED, REJECTED, or NEEDS_CLARIFICATION).");
      return;
    }

    setIsSubmittingReview(true);
    setReviewSaveError(null);
    setReviewSaveSuccess(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        decision: selectedDecision,
        notes: reviewNotes.trim() || null,
        observation_decisions: humanReviewChecks,
        expected_version: latestReview ? latestReview.version : 0,
        idempotency_key: idempotencyKey,
      };

      const res = await fetch(`/api/v1/qc/jobs/${encodeURIComponent(activeJobId)}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const errJson = await res.json().catch(() => ({}));
        setReviewSaveError(
          errJson.detail ||
            "Stale review update: A newer review was submitted in another session. Refreshed to latest state."
        );
        await loadReviews(activeJobId);
        return;
      }

      if (!res.ok) {
        let detail = `Review submission failed (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          detail = errJson.detail || detail;
        } catch {
          const raw = await res.text().catch(() => "");
          if (raw) detail = raw.slice(0, 150);
        }
        throw new Error(detail);
      }

      const savedReview: SanitizedReviewRecord = await res.json();
      setLatestReview(savedReview);
      setReviewsHistory((prev) => [savedReview, ...prev.filter((r) => r.id !== savedReview.id)]);
      setReviewSaveSuccess(
        `Review version ${savedReview.version} (${savedReview.decision}) successfully saved by ${savedReview.reviewer.name}.`
      );
    } catch (err: any) {
      setReviewSaveError(err.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // --------------------------------------------------------------------------
  // Audit Export: Separates authoritative server report from human review audit
  // --------------------------------------------------------------------------
  const exportReport = () => {
    if (!currentJob) return;
    const exportData = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        integrity_note:
          "Traceable Audit Log (Database-persisted server records, non-cryptographically signed). Machine evaluation and human review history are separated and independently auditable.",
      },
      // 1. Authoritative automated server report (IMMUTABLE machine evaluation)
      authoritative_automated_report: {
        job_id: currentJob.job_id,
        document_name: currentJob.document_name,
        document_sha256: currentJob.document_sha256,
        standard: currentJob.standard,
        overall_outcome: currentJob.overall_outcome,
        page_coverage: currentJob.page_coverage,
        disclaimer: currentJob.disclaimer,
        report: currentJob.report,
      },
      // 2. Persisted human review history (AUDITABLE inspector sign-off)
      persisted_human_review_audit: {
        total_reviews: reviewsHistory.length,
        current_disposition: latestReview ? latestReview.decision : "PENDING_INSPECTOR_REVIEW",
        latest_review: latestReview,
        review_history: reviewsHistory,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SpanQC_AuditReport_${currentJob.job_id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const report = currentJob?.report;

  return (
    <div className="space-y-6">
      {/* Experimental PoC Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-300 text-sm">
                EXPERIMENTAL PROOF OF CONCEPT: Asynchronous Wiring QC Bridge
              </span>
              <Badge variant="ai">Isolated Research Mode</Badge>
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5">
              Processes candidate vision extractions through server-side async worker queues. Does NOT modify the production flight release workflow at /app/check.
            </p>
          </div>
        </div>

        {/* Existing Job Lookup / Resume Bar */}
        <form onSubmit={handleResumeJob} className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Resume Job ID..."
            value={resumeJobInput}
            onChange={(e) => setResumeJobInput(e.target.value)}
            className="w-48 sm:w-56 px-2.5 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-400"
          />
          <Button type="submit" size="sm" variant="outline" className="text-xs gap-1">
            <Search className="w-3 h-3" />
            Resume
          </Button>
        </form>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 shadow-sm">
          <XCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Notice:</div>
            <div className="text-slate-300 leading-relaxed">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Main Grid: Upload & Controls on Left, Results & Findings on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upload & Ingestion Controls */}
        <div className="space-y-4">
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-slate-200 text-sm">Schematic Document Ingestion</h3>
              </div>
              {currentJob?.document_sha256 && currentJob.document_sha256 !== "Pending" && (
                <div className="text-[11px] font-mono text-slate-400">
                  SHA-256: {currentJob.document_sha256.slice(0, 10)}...
                </div>
              )}
            </div>

            {/* Project & Standards Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Assigned Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-400 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {projects.length === 0 && <option value="">No projects available</option>}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Engineering Standard</label>
                <select
                  value={standard}
                  onChange={(e) => setStandard(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-400 text-xs font-mono"
                >
                  <option value="IPC/WHMA-A-620D">IPC/WHMA-A-620D (Class 3)</option>
                  <option value="MIL-STD-681">MIL-STD-681 (Aerospace)</option>
                </select>
              </div>
            </div>

            {/* Scope & Verification Contracts */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-2 text-xs">
              <div className="text-slate-300 font-medium">Traceability &amp; Safeguard Contracts</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={specComplete}
                    onChange={(e) => setSpecComplete(e.target.checked)}
                    className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Specification Declared Complete</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={extractionVerified}
                    onChange={(e) => setExtractionVerified(e.target.checked)}
                    className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Extraction Verified by Reviewer</span>
                </label>
              </div>
            </div>

            {/* Expected Netlist JSON (Optional) */}
            <div>
              <label className="block text-slate-400 mb-1 text-xs font-medium">
                Expected Netlist JSON (Optional — default benchmark netlist used if empty)
              </label>
              <textarea
                rows={2}
                value={netlistInput}
                onChange={(e) => setNetlistInput(e.target.value)}
                placeholder='[{"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1"}]'
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] focus:outline-none focus:border-sky-400 placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Upload Drag & Drop Zone */}
            <div
              onClick={() => {
                if (!isSubmitting && !isPolling) fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center gap-2 ${
                isSubmitting || isPolling
                  ? "border-slate-800 bg-slate-950/20 cursor-not-allowed opacity-60"
                  : "border-slate-700 hover:border-sky-500/80 bg-slate-950/40 hover:bg-sky-500/5 cursor-pointer"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                disabled={isSubmitting || isPolling}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-sky-400/80 animate-pulse" />
              <div className="font-medium text-slate-200 text-sm">
                Drop schematic file or click to browse
              </div>
              <div className="text-xs text-slate-400">
                Supports PDF, PNG, and JPEG (Max 25 MB). Analyzed asynchronously via durable job queue.
              </div>
            </div>

            {/* Asynchronous Progress Display */}
            {(isSubmitting || isPolling || currentJob?.status === "QUEUED" || currentJob?.status === "PROCESSING") && (
              <div className="p-4 bg-sky-950/30 border border-sky-800/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-sky-300 font-semibold">
                    <Cpu className="w-4 h-4 animate-spin text-sky-400" />
                    <span>
                      {currentJob?.status === "QUEUED"
                        ? "Job Queued in Durable Buffer..."
                        : "Processing Multimodal Vision Extraction..."}
                    </span>
                  </div>
                  {isPolling && (
                    <span className="text-[11px] text-sky-400/80 font-mono flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Polling Status
                    </span>
                  )}
                </div>

                {/* Processing Steps */}
                <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-mono pt-1">
                  <div className="bg-sky-500/10 border border-sky-500/30 rounded p-1.5 text-sky-300">
                    1. Stored Privately
                  </div>
                  <div
                    className={`rounded p-1.5 border transition ${
                      currentJob?.status === "PROCESSING"
                        ? "bg-sky-500/20 border-sky-400 text-sky-200 font-bold animate-pulse"
                        : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    2. Vision Inference
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-500">
                    3. Rule Evaluator
                  </div>
                </div>
              </div>
            )}

            {/* Rendered Page & Interactive Bounding Box Viewer */}
            <div className="min-h-[420px] bg-black/60 rounded-xl border border-slate-800/80 flex items-center justify-center relative overflow-hidden">
              {report?.pages_rendered && report.pages_rendered.length > 0 ? (
                <div className="relative inline-block max-w-full max-h-[550px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.pages_rendered[0]}
                    alt="Rendered Schematic Page"
                    className="max-w-full max-h-[550px] object-contain rounded"
                  />
                  {/* Evidence Bounding Boxes */}
                  {report.candidate_observations.map((obs) => {
                    if (!obs.coordinates) return null;
                    const c = obs.coordinates;
                    const isHovered =
                      hoveredCoord &&
                      hoveredCoord.ymin === c.ymin &&
                      hoveredCoord.xmin === c.xmin;
                    return (
                      <div
                        key={obs.observation_id}
                        className={`absolute border-2 transition-all cursor-pointer ${
                          isHovered
                            ? "border-amber-400 bg-amber-400/30 z-20 shadow-lg shadow-amber-400/50 scale-[1.01]"
                            : "border-sky-400/80 bg-sky-400/15 hover:border-amber-400 hover:bg-amber-400/20"
                        }`}
                        style={{
                          top: `${c.ymin * 100}%`,
                          left: `${c.xmin * 100}%`,
                          width: `${(c.xmax - c.xmin) * 100}%`,
                          height: `${(c.ymax - c.ymin) * 100}%`,
                        }}
                        title={`${obs.wire_id || obs.observation_id}: ${obs.observed_text}`}
                      >
                        <span className="absolute -top-4 left-0 bg-slate-900 border border-slate-700 text-sky-300 font-mono text-[9px] px-1 rounded whitespace-nowrap">
                          {obs.wire_id || obs.observation_id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center p-8 space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <div>No schematic canvas rendered yet.</div>
                  <div className="text-[11px] text-slate-600">
                    Upload a schematic drawing or resume an existing Job ID to inspect visual evidence.
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Outcomes, Page Coverage & Findings */}
        <div className="space-y-4">
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-200 text-sm">Deterministic Verification Results</h3>
              {report && (
                <Button size="sm" variant="outline" onClick={exportReport} className="text-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Export Report JSON
                </Button>
              )}
            </div>

            {/* Active Job Identifier & Copy */}
            {currentJob?.job_id && (
              <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Job ID:</span>
                  <span className="text-sky-300">{currentJob.job_id}</span>
                </div>
                <button
                  onClick={copyJobIdToClipboard}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                  title="Copy Job ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Overall Outcome Banner */}
            {currentJob?.status === "FAILED" ? (
              <div className="p-4 rounded-xl border bg-rose-950/30 border-rose-500/40 text-rose-200 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider font-mono text-rose-400">
                      Operational Failure
                    </div>
                    <div className="text-lg font-bold tracking-tight">
                      STATUS: ANALYSIS EXECUTION FAILED
                    </div>
                  </div>
                  <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                </div>
                <p className="text-xs text-rose-300/80 pt-1">
                  {currentJob.error_message || "The analysis worker failed or timed out. Check quota has been restored to your organization."}
                </p>
                <div className="text-[11px] text-rose-400/90 font-mono pt-1">
                  Note: This indicates a worker execution failure, NOT a schematic defect.
                </div>
              </div>
            ) : currentJob?.overall_outcome ? (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  currentJob.overall_outcome === "PASS"
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : currentJob.overall_outcome === "FAIL"
                    ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
                    : "bg-amber-950/30 border-amber-500/40 text-amber-200"
                }`}
              >
                <div>
                  <div className="text-xs uppercase tracking-wider font-mono opacity-80">
                    Deterministic Status ({currentJob.status})
                  </div>
                  <div className="text-xl font-bold tracking-tight">
                    OVERALL OUTCOME: {currentJob.overall_outcome}
                  </div>
                  <div className="text-xs font-mono mt-1 opacity-80">
                    Standard: {currentJob.standard} • Model: {report?.model_used || "gemma3:4b"}
                  </div>
                </div>
                <div className="text-3xl">
                  {currentJob.overall_outcome === "PASS" ? (
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  ) : currentJob.overall_outcome === "FAIL" ? (
                    <XCircle className="w-8 h-8 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 text-center text-slate-500 text-xs">
                {currentJob?.status === "QUEUED"
                  ? "Job is queued in durable storage. Waiting for background worker pickup..."
                  : currentJob?.status === "PROCESSING"
                  ? "Job is actively processing against the vision model..."
                  : "Awaiting schematic document ingestion or job resumption."}
              </div>
            )}

            {/* Independent Human Inspector Disposition Card */}
            {currentJob?.job_id && (
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-semibold text-slate-200">
                      Inspector Disposition:
                    </span>
                    {latestReview ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          latestReview.decision === "ACCEPTED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : latestReview.decision === "REJECTED"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {latestReview.decision} (v{latestReview.version})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        PENDING INSPECTOR SIGN-OFF
                      </span>
                    )}
                  </div>
                  {latestReview && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Reviewed by {latestReview.reviewer.name} ({latestReview.reviewer.role}) • {new Date(latestReview.created_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-300">Safeguard Policy:</span> Inspector sign-off does NOT modify or promote the authoritative machine QC outcome ({currentJob.overall_outcome || "PENDING"}). Both machine evaluation and human sign-offs are persisted independently for aerospace traceability.
                </p>
              </div>
            )}

            {/* Coverage Diagnostic Bar */}
            {currentJob?.page_coverage && (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Coverage:</span>
                  <span className="text-sky-300">
                    {currentJob.page_coverage.processed_pages} / {currentJob.page_coverage.total_pages} Pages
                  </span>
                </div>
                {currentJob.page_coverage.failed_pages > 0 && (
                  <span className="text-rose-400 font-semibold">
                    {currentJob.page_coverage.failed_pages} Failed Page(s)
                  </span>
                )}
                {currentJob.page_coverage.unprocessed_page_numbers?.length > 0 && (
                  <span className="text-amber-400">
                    Unprocessed: {currentJob.page_coverage.unprocessed_page_numbers.join(", ")}
                  </span>
                )}
              </div>
            )}

            {/* Partial Coverage or Safeguard Warnings */}
            {currentJob?.page_coverage &&
              (currentJob.page_coverage.failed_pages > 0 ||
                currentJob.page_coverage.unprocessed_page_numbers?.length > 0) && (
                <div className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded-lg text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Partial page coverage detected. Any document-level PASS outcome is blocked by the coverage guard.
                  </span>
                </div>
              )}

            {/* Tabs for Findings / Candidates / Review / Coverage */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab("findings")}
                className={`py-2 px-3 font-medium border-b-2 transition ${
                  activeTab === "findings"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Rule Findings ({report?.rule_findings?.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab("candidates")}
                className={`py-2 px-3 font-medium border-b-2 transition ${
                  activeTab === "candidates"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Candidate Observations ({report?.candidate_observations?.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab("review")}
                className={`py-2 px-3 font-medium border-b-2 transition ${
                  activeTab === "review"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Human Review ({report?.candidate_observations?.filter((o) => o.requires_human_review).length ?? 0}
                {latestReview ? ` • v${latestReview.version}` : ""})
              </button>
              <button
                onClick={() => setActiveTab("coverage")}
                className={`py-2 px-3 font-medium border-b-2 transition ${
                  activeTab === "coverage"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Page Diagnostics
              </button>
            </div>

            {/* Tab 1: Deterministic Findings */}
            {activeTab === "findings" && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {report?.rule_findings?.length ? (
                  report.rule_findings.map((finding) => (
                    <div
                      key={finding.finding_id}
                      onMouseEnter={() => finding.coordinates && setHoveredCoord(finding.coordinates)}
                      onMouseLeave={() => setHoveredCoord(null)}
                      className="p-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg space-y-2 text-xs transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-sky-400 font-semibold">
                          {finding.rule_id} • {finding.standard_reference}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            finding.outcome === "PASS"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : finding.outcome === "FAIL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {finding.outcome}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-200">{finding.title}</div>
                      <p className="text-slate-400 leading-relaxed">{finding.reason}</p>
                      {finding.coordinates && (
                        <div className="text-[10px] font-mono text-slate-500 bg-slate-900/80 p-1.5 rounded">
                          Coordinates: ymin={finding.coordinates.ymin.toFixed(2)}, xmin={finding.coordinates.xmin.toFixed(2)}, ymax={finding.coordinates.ymax.toFixed(2)}, xmax={finding.coordinates.xmax.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No rule findings available.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Candidate Observations */}
            {activeTab === "candidates" && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {report?.candidate_observations?.length ? (
                  report.candidate_observations.map((obs) => (
                    <div
                      key={obs.observation_id}
                      onMouseEnter={() => obs.coordinates && setHoveredCoord(obs.coordinates)}
                      onMouseLeave={() => setHoveredCoord(null)}
                      className="p-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg space-y-2 text-xs transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400">
                          ID: {obs.observation_id} (Page {obs.page_number})
                        </span>
                        <span className="font-mono text-sky-400 text-[11px]">
                          Confidence: {(obs.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="font-semibold text-slate-200">
                        Wire: <span className="text-sky-300">{obs.wire_id || "UNIDENTIFIED"}</span>
                        {" "}[Gauge: {obs.wire_gauge || "N/A"}, Color: {obs.wire_color || "N/A"}]
                      </div>
                      <div className="text-slate-400">
                        Terminals: <span className="font-mono text-slate-300">{obs.source_terminal || "?"}</span> ➔{" "}
                        <span className="font-mono text-slate-300">{obs.destination_terminal || "?"}</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded font-mono text-[11px] text-sky-400/90">
                        Evidence: &ldquo;{obs.observed_text}&rdquo;
                      </div>
                      {obs.ambiguity_reasons.length > 0 && (
                        <div className="text-amber-400/90 text-[11px]">
                          ⚠️ Ambiguity: {obs.ambiguity_reasons.join("; ")}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No candidate observations extracted.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Durable Human Review & Audit Trail */}
            {activeTab === "review" && (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 text-xs">
                {/* Protocol Note */}
                <div className="p-3 bg-sky-950/20 border border-sky-900/40 rounded-lg text-slate-300 space-y-1">
                  <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-sky-400" />
                    Aerospace Review &amp; Sign-Off Protocol
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Qualified inspectors review visual candidate ambiguities, rule findings, and completeness.
                    Submitting records an immutable, versioned audit entry to the server database. Prior review decisions remain preserved.
                  </p>
                </div>

                {/* Success Banner */}
                {reviewSaveSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{reviewSaveSuccess}</span>
                  </div>
                )}

                {/* Error Banner */}
                {reviewSaveError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{reviewSaveError}</span>
                  </div>
                )}

                {/* Active Review Form */}
                <form onSubmit={handleSubmitReview} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Inspector Disposition Form (Target v{(latestReview?.version ?? 0) + 1})
                    </span>
                    {isLoadingReviews && (
                      <span className="text-[11px] text-sky-400 flex items-center gap-1 font-mono">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Syncing reviews...
                      </span>
                    )}
                  </div>

                  {/* Decision Selector */}
                  <div>
                    <label className="block text-slate-400 mb-1.5 text-xs font-medium">
                      Formal Decision <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDecision("ACCEPTED")}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          selectedDecision === "ACCEPTED"
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ACCEPTED
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDecision("REJECTED")}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          selectedDecision === "REJECTED"
                            ? "bg-rose-500/20 border-rose-400 text-rose-300 ring-1 ring-rose-400"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        REJECTED
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDecision("NEEDS_CLARIFICATION")}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          selectedDecision === "NEEDS_CLARIFICATION"
                            ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        NEEDS CLARIFICATION
                      </button>
                    </div>
                  </div>

                  {/* Review Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400 text-xs font-medium">
                        Engineering Review Notes &amp; Discrepancy Log
                      </label>
                      <span className={`text-[10px] font-mono ${reviewNotes.length > 2000 ? "text-rose-400" : "text-slate-500"}`}>
                        {reviewNotes.length} / 2000
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={reviewNotes}
                      maxLength={2000}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Document physical sample validation, drawing discrepancies, customer RFI references, or rationale..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-400 placeholder:text-slate-600 resize-none"
                    />
                  </div>

                  {/* Per-Observation Confirmations */}
                  <div className="space-y-2 pt-1">
                    <span className="text-slate-300 font-medium block">
                      Ambiguous Candidate Confirmations ({report?.candidate_observations?.filter((o) => o.requires_human_review).length ?? 0}):
                    </span>
                    {report?.candidate_observations?.filter((o) => o.requires_human_review).length ? (
                      report.candidate_observations
                        .filter((o) => o.requires_human_review)
                        .map((item) => (
                          <div
                            key={item.observation_id}
                            className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between text-xs gap-3"
                          >
                            <div>
                              <div className="font-mono text-amber-400 font-semibold text-[11px]">
                                {item.observation_id} — {item.wire_id || "Unidentified Wire"}
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                Route: {item.source_terminal || "?"} ➔ {item.destination_terminal || "?"}
                              </div>
                              <div className="text-slate-500 text-[10px]">
                                {item.ambiguity_reasons.join("; ")}
                              </div>
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs shrink-0">
                              <input
                                type="checkbox"
                                checked={!!humanReviewChecks[item.observation_id]}
                                onChange={() => toggleReview(item.observation_id)}
                                className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                              />
                              <span>Confirmed</span>
                            </label>
                          </div>
                        ))
                    ) : (
                      <div className="text-slate-500 text-[11px] p-2 bg-slate-900/50 rounded">
                        No candidate observations flagged as requiring manual review.
                      </div>
                    )}
                  </div>

                  {/* Form Submission Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => activeJobId && loadReviews(activeJobId)}
                      disabled={isLoadingReviews}
                      className="text-xs gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReviews ? "animate-spin" : ""}`} />
                      Sync Server Reviews
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        isSubmittingReview ||
                        !selectedDecision ||
                        !activeJobId ||
                        ["QUEUED", "PROCESSING"].includes(currentJob?.status || "")
                      }
                      className="text-xs gap-1.5 bg-sky-600 hover:bg-sky-500 text-white"
                    >
                      {isSubmittingReview ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Persisting Review...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Submit Durable Review
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Audit History Log */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <History className="w-4 h-4 text-sky-400" />
                    Durable Review Audit History ({reviewsHistory.length})
                  </div>

                  {reviewsHistory.length > 0 ? (
                    <div className="space-y-2">
                      {reviewsHistory.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sky-300">Version {rev.version}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  rev.decision === "ACCEPTED"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : rev.decision === "REJECTED"
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {rev.decision}
                              </span>
                            </div>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {new Date(rev.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div className="text-slate-400 text-[11px]">
                            Reviewer: <span className="text-slate-200">{rev.reviewer.name}</span> ({rev.reviewer.email} • {rev.reviewer.role})
                          </div>

                          {rev.notes && (
                            <p className="text-slate-300 bg-slate-900/80 p-2 rounded text-[11px] leading-relaxed">
                              &ldquo;{rev.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-[11px] p-4 bg-slate-950/40 border border-dashed border-slate-800 rounded text-center">
                      No review decisions submitted yet for this job.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Page Diagnostics */}
            {activeTab === "coverage" && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-200">Page Processing Ledger</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>Total Pages Declared: {currentJob?.page_coverage?.total_pages ?? 0}</div>
                    <div>Pages Successfully Processed: {currentJob?.page_coverage?.processed_pages ?? 0}</div>
                    <div>Failed Pages: {currentJob?.page_coverage?.failed_pages ?? 0}</div>
                    <div>Unprocessed Pages: {currentJob?.page_coverage?.unprocessed_page_numbers?.length ?? 0}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-200">Engine Disclaimers &amp; Audit Trail</div>
                  <p className="text-[11px] leading-relaxed">
                    {currentJob?.disclaimer ||
                      "EXPERIMENTAL PROOF OF CONCEPT: Results are candidate AI extractions validated by deterministic rules. Not certified for flight or production release without human engineering sign-off."}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
