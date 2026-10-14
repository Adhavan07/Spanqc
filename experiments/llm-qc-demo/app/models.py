from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNCERTAIN = "UNCERTAIN"

class EvaluationOutcome(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    REVIEW = "REVIEW"

class EvaluationSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    MAJOR = "MAJOR"
    MINOR = "MINOR"
    WARNING = "WARNING"
    INFO = "INFO"

class EvidenceCoordinates(BaseModel):
    """
    Normalized bounding box coordinates [0.0 - 1.0] relative to the rendered page.
    ymin, xmin, ymax, xmax represents top-left to bottom-right bounds.
    """
    ymin: float = Field(..., ge=0.0, le=1.0, description="Top Y coordinate (0.0 - 1.0)")
    xmin: float = Field(..., ge=0.0, le=1.0, description="Left X coordinate (0.0 - 1.0)")
    ymax: float = Field(..., ge=0.0, le=1.0, description="Bottom Y coordinate (0.0 - 1.0)")
    xmax: float = Field(..., ge=0.0, le=1.0, description="Right X coordinate (0.0 - 1.0)")

    @field_validator("ymax")
    @classmethod
    def validate_y_bounds(cls, v: float, info):
        ymin = info.data.get("ymin", 0.0)
        if v < ymin:
            raise ValueError(f"ymax ({v}) cannot be less than ymin ({ymin})")
        return v

    @field_validator("xmax")
    @classmethod
    def validate_x_bounds(cls, v: float, info):
        xmin = info.data.get("xmin", 0.0)
        if v < xmin:
            raise ValueError(f"xmax ({v}) cannot be less than xmin ({xmin})")
        return v

class CandidateObservation(BaseModel):
    """
    Structured extraction candidate observed by the vision-language model.
    Represents an evidence-grounded candidate observation, NEVER an authoritative decision.
    """
    observation_id: str = Field(..., description="Unique observation ID (e.g. OBS-1)")
    page_number: int = Field(..., ge=1, description="1-based page number")
    
    # Identifiers
    component_id: Optional[str] = Field(None, description="Component designator, e.g. J1, K2, TB-GND")
    connector_id: Optional[str] = Field(None, description="Connector identifier, e.g. CON-01")
    pin_id: Optional[str] = Field(None, description="Pin / contact identifier, e.g. 4, Pin B")
    
    # Wire attributes
    wire_id: Optional[str] = Field(None, description="Wire identifier / net name, e.g. W102, W-PWR-01")
    wire_gauge: Optional[str] = Field(None, description="Conductor gauge, e.g. 20 AWG, 18 AWG")
    wire_color: Optional[str] = Field(None, description="Conductor insulation color, e.g. RED, BLU, WHT/BLU")
    
    # Candidate connectivity
    source_terminal: Optional[str] = Field(None, description="Candidate source terminal, e.g. J1:4")
    destination_terminal: Optional[str] = Field(None, description="Candidate destination terminal, e.g. TB1:12")
    
    # Evidence & coordinates
    coordinates: Optional[EvidenceCoordinates] = Field(None, description="Bounding box of callout evidence")
    observed_text: str = Field(..., min_length=1, description="Legible text or callout observed in the schematic")
    
    # Uncertainty & human review
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Genuine confidence estimate (0.0 to 1.0)")
    confidence_level: ConfidenceLevel = Field(default=ConfidenceLevel.MEDIUM)
    ambiguity_reasons: List[str] = Field(default_factory=list, description="Reasons why observation may be ambiguous")
    requires_human_review: bool = Field(default=False, description="True if evidence is incomplete or ambiguous")
    review_fields: List[str] = Field(default_factory=list, description="Fields requiring human verification")

class VerificationMethod(str, Enum):
    INDEPENDENT_HUMAN_INSPECTION = "INDEPENDENT_HUMAN_INSPECTION"
    DETERMINISTIC_CAD_VECTOR_RECONCILIATION = "DETERMINISTIC_CAD_VECTOR_RECONCILIATION"
    MODEL_SELF_ATTESTATION = "MODEL_SELF_ATTESTATION"  # Explicitly rejected by rule evaluator

class TrustedExtractionVerification(BaseModel):
    """
    Authoritative record verifying that visual extraction coverage was independently confirmed complete.
    Cannot be self-attested by the vision model or asserted via an unverified caller boolean.
    Bound to a specific verifier identity, verification method, document hash, and scope.
    """
    verifier_id: str = Field(..., min_length=1, description="Authenticated reviewer or authority identifier")
    verification_method: VerificationMethod = Field(..., description="Method used to confirm extraction completeness")
    verified_scope: str = Field(..., min_length=1, description="Exact sheet/subsystem scope verified")
    document_sha256: Optional[str] = Field(None, min_length=64, max_length=64, description="Authoritative SHA-256 of the verified document")
    verified_at: str = Field(..., description="ISO 8601 UTC timestamp of verification")
    notes: Optional[str] = Field(None, description="Reviewer comments or verification notes")

class ExpectedWireConnection(BaseModel):
    """
    Expected engineering netlist / connectivity specification for deterministic comparison.
    """
    wire_id: str = Field(..., description="Expected wire identifier, e.g. W101")
    expected_source: str = Field(..., description="Expected source terminal, e.g. J1:1")
    expected_destination: str = Field(..., description="Expected destination terminal, e.g. K1:A1")
    expected_gauge: Optional[str] = Field(None, description="Expected conductor gauge, e.g. 20 AWG")
    expected_color: Optional[str] = Field(None, description="Expected conductor color, e.g. RED")

class NetlistSpecification(BaseModel):
    """
    Authoritative engineering netlist specification with explicit completeness contract.
    """
    wires: List[ExpectedWireConnection] = Field(..., description="List of expected wire connections")
    is_complete: Optional[bool] = Field(None, description="Explicit certification that this netlist covers the complete declared drawing scope")
    extraction_is_verified: Optional[bool] = Field(None, description="Caller-asserted extraction flag (untrusted metadata; cannot authorize PASS alone)")
    trusted_verification: Optional[TrustedExtractionVerification] = Field(None, description="Authoritative extraction verification record bound to reviewer and document")
    scope_description: Optional[str] = Field(None, description="Declared drawing sheet or subsystem scope")

class DeterministicRuleFinding(BaseModel):
    """
    Rule finding produced by the deterministic validation engine.
    Every finding cites an explicit rule ID, evidence, severity, and outcome.
    """
    finding_id: str
    rule_id: str
    rule_name: str
    standard_reference: str
    severity: EvaluationSeverity
    outcome: EvaluationOutcome
    title: str
    reason: str
    expected_value: Optional[str] = None
    detected_value: Optional[str] = None
    evidence_text: Optional[str] = None
    page_number: Optional[int] = None
    coordinates: Optional[EvidenceCoordinates] = None
    human_review_required: bool = False
    human_decision: Optional[str] = None  # "CONFIRMED", "REJECTED", "NEEDS_REVIEW"
    human_comment: Optional[str] = None

class QCReport(BaseModel):
    """
    Complete audit report combining real model extraction, deterministic rule findings,
    and rendered evidence artifacts.
    """
    report_id: str
    document_name: str
    sha256_hash: str
    standard: str
    created_at: str
    model_used: str
    overall_outcome: EvaluationOutcome
    specification_is_complete: bool = False
    extraction_is_verified: bool = False
    trusted_verification: Optional[TrustedExtractionVerification] = None
    scope_description: Optional[str] = None
    rule_findings: List[DeterministicRuleFinding]
    candidate_observations: List[CandidateObservation]
    pages_rendered: List[str] = Field(default_factory=list, description="Base64 data URLs of rendered pages")
    total_page_count: int = Field(default=1, description="Total pages detected in original document")
    processed_page_count: int = Field(default=1, description="Number of pages successfully rasterized and processed")
    failed_page_count: int = Field(default=0, description="Number of pages that failed extraction or rasterization")
    unprocessed_page_numbers: List[int] = Field(default_factory=list, description="1-based page numbers not processed")
    failed_page_numbers: List[int] = Field(default_factory=list, description="1-based page numbers where extraction failed")
    is_experimental: bool = True
    disclaimer: str = (
        "EXPERIMENTAL PROOF OF CONCEPT: Results are candidate AI extractions validated by deterministic rules. "
        "A document-level PASS outcome certifies that (1) an explicitly declared COMPLETE netlist was supplied for the declared scope, "
        "(2) visual extraction coverage was independently confirmed complete by an authorized reviewer or deterministic method (caller-supplied booleans are untrusted metadata and cannot authorize PASS), "
        "(3) all expected connections and conductor attributes matched candidate observations, "
        "(4) zero unlisted wires remained, and (5) no visual ambiguities were detected. "
        "A PASS does NOT apply to uncertified partial specifications, caller-asserted booleans, or unverified extraction coverage. "
        "NOT certified for flight or production approval without human inspector sign-off."
    )

