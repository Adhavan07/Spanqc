export type QCJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "REVIEW_REQUIRED" | "FAILED";

export type QCOverallOutcome = "PASS" | "FAIL" | "REVIEW";

export interface EvidenceCoordinates {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface RuleFinding {
  finding_id: string;
  rule_id: string;
  rule_name: string;
  standard_reference: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  outcome: QCOverallOutcome;
  title: string;
  reason: string;
  expected_value?: string | null;
  detected_value?: string | null;
  evidence_text?: string | null;
  page_number?: number | null;
  coordinates?: EvidenceCoordinates | null;
  human_review_required: boolean;
  human_decision?: string | null;
  human_comment?: string | null;
}

export interface CandidateObservation {
  observation_id: string;
  page_number?: number;
  wire_id: string;
  source_terminal?: string | null;
  destination_terminal?: string | null;
  gauge?: string | null;
  color?: string | null;
  confidence?: number;
  coordinates?: EvidenceCoordinates | null;
  is_ambiguous?: boolean;
}

export interface QCReport {
  report_id: string;
  document_name: string;
  sha256_hash: string;
  standard: string;
  created_at: string;
  model_used: string;
  overall_outcome: QCOverallOutcome;
  specification_is_complete: boolean;
  extraction_is_verified: boolean;
  trusted_verification?: unknown;
  scope_description?: string | null;
  rule_findings: RuleFinding[];
  candidate_observations: CandidateObservation[];
  pages_rendered?: string[];
  total_page_count: number;
  processed_page_count: number;
  failed_page_count: number;
  unprocessed_page_numbers: number[];
  failed_page_numbers: number[];
  is_experimental: boolean;
  disclaimer: string;
}

export interface QCJobCreationResponse {
  job_id: string;
  status: QCJobStatus;
  document_name: string;
  document_sha256: string;
  standard: string;
  quota_reserved: boolean;
  created_at: string;
  message: string;
}

export interface QCJobStatusResponse {
  job_id: string;
  status: QCJobStatus;
  overall_outcome: QCOverallOutcome | null;
  document_name: string;
  document_sha256: string;
  standard: string;
  page_coverage: {
    total_pages: number;
    processed_pages: number;
    failed_pages: number;
    unprocessed_page_numbers: number[];
    failed_page_numbers: number[];
  };
  report?: QCReport | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  is_experimental: boolean;
  disclaimer: string;
}

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

export interface QCJobReviewsResponse {
  job_id: string;
  total_reviews: number;
  latest_review: SanitizedReviewRecord | null;
  history: SanitizedReviewRecord[];
}
