export type QCJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "REVIEW_REQUIRED" | "FAILED";

export type QCOverallOutcome = "PASS" | "FAIL" | "REVIEW";

export interface EvidenceCoordinates {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface CircuitViabilityImpact {
  status: string; // "WILL NOT WORK (CRITICAL FAILURE)" | "DEFECTIVE DOCUMENTATION (OPERATIONAL RISK)" | "OPERATIVE / CONFORMING"
  will_work: boolean;
  circuit_consequence: string;
  safety_hazard: string;
  remediation_required: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
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
  circuit_impact?: CircuitViabilityImpact | null;
  root_cause?: string | null;
  node_reference_oem?: string | null;
  node_reference_redraw?: string | null;
  future_problem?: string | null;
  remediation_required?: string | null;
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
  will_work?: boolean;
  circuit_status?: string;
  circuit_notes?: string;
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
  precision_score?: number;
  precision_mode?: string;
  precision_guarantee?: string;
  zero_false_positive_enforced?: boolean;
  verified_evidence_count?: number;
  comparison_mode?: boolean;
  oem_master_document?: string;
  output_delivery_package?: string;
  output_sheets_count?: number;
  will_work_count?: number;
  will_not_work_count?: number;
  documentation_error_count?: number;
  circuit_impacts?: CircuitViabilityImpact[];
  components_detected?: Array<{
    designator: string;
    symbol_code: string;
    symbol_name: string;
    category: string;
    sheet: string;
    node_ref: string;
    source_type?: string;
    evidence?: string;
  }>;
  svg_jpg_pairing?: {
    svg_count: number;
    jpg_count: number;
    matched_pairs: number;
    unpaired_svgs: string[];
    unpaired_jpgs: string[];
  } | null;
  segmentation_pipeline?: {
    module_segments: Array<{
      module_number: string;
      module_title: string;
      pages: number[];
      sheet_codes: string[];
      output_sheets: string[];
      component_count: number;
      wire_count: number;
      confirmed_fine: number;
      wrong_count: number;
      score: number;
      status: string;
    }>;
    page_segments: Array<{
      page_number: number;
      sheet_code: string;
      module_number: string;
      functional_segment: string;
      component_count: number;
      wire_count: number;
      matched_output_sheets: string[];
      status: string;
    }>;
    functional_segments: Array<{
      functional_segment: string;
      modules: string[];
      sheets: string[];
      components: string[];
      wire_count: number;
    }>;
    cross_sheet_paths: Array<{
      node: string;
      path: string;
      sheet_count: number;
      status: string;
    }>;
    line_by_line_validation: Array<{
      line_no: number;
      module_number: string;
      sheet_code: string;
      page: number;
      functional_segment: string;
      wire_no: string;
      colour: string;
      size_mm2: string | number | null;
      from_node: string;
      to_node: string;
      cross_sheet_path?: string | null;
      validation_status: "CONFIRMED_FINE" | "WRONG_CRITICAL" | "WRONG_REVIEW" | "UNVERIFIED_INPUT_ONLY";
      verdict: string;
      remediation: string;
      evidence: string;
    }>;
    validation_summary: {
      total_modules: number;
      total_pages_segmented: number;
      total_functional_zones: number;
      total_lines_traced: number;
      confirmed_fine_count: number;
      wrong_count: number;
      unverified_count: number;
      cross_sheet_paths_count: number;
      overall_score: number;
      verdict_banner: string;
    };
  } | null;
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
  precision_score?: number;
  precision_mode?: string;
  precision_guarantee?: string;
  zero_false_positive_enforced?: boolean;
  verified_evidence_count?: number;
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
