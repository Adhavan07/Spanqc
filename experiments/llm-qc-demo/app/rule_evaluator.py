import uuid
from typing import List, Optional, Tuple
from .models import (
    CandidateObservation,
    DeterministicRuleFinding,
    EvaluationOutcome,
    EvaluationSeverity,
    ExpectedWireConnection,
    TrustedExtractionVerification,
    VerificationMethod,
)

class DeterministicRuleEvaluator:
    """
    Independent deterministic rule validation layer.
    Consumes validated extraction data from the vision model and verifies it against
    explicit electrical harness standards (IPC/WHMA-A-620D, UL 508A).

    CRITICAL SAFETY INVARIANT:
    An LLM extraction alone NEVER authorizes a PASS outcome.
    A caller-supplied boolean alone NEVER constitutes extraction verification.
    PASS is only achieved when all rules evaluate to PASS against a certified complete
    specification AND visual extraction coverage is backed by genuine trusted verification evidence.
    """

    def evaluate(
        self,
        observations: List[CandidateObservation],
        expected_netlist: Optional[List[ExpectedWireConnection]] = None,
        specification_is_complete: Optional[bool] = None,
        standard: str = "IPC/WHMA-A-620D",
        extraction_is_verified: Optional[bool] = None,
        trusted_verification: Optional[TrustedExtractionVerification] = None,
        document_sha256: Optional[str] = None,
        scope_description: Optional[str] = None,
        total_page_count: Optional[int] = None,
        processed_page_count: Optional[int] = None,
        unprocessed_page_numbers: Optional[List[int]] = None,
        failed_page_numbers: Optional[List[int]] = None,
    ) -> Tuple[EvaluationOutcome, List[DeterministicRuleFinding]]:
        findings: List[DeterministicRuleFinding] = []

        # 0. Empty input guard: No observations can never authorize PASS
        if not observations:
            findings.append(
                DeterministicRuleFinding(
                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                    rule_id="RULE-INGESTION-00",
                    rule_name="No Legible Schematic Elements",
                    standard_reference=standard,
                    severity=EvaluationSeverity.CRITICAL,
                    outcome=EvaluationOutcome.REVIEW,
                    title="No Candidate Observations Extracted",
                    reason="The vision model did not identify any legible wire or component observations on the schematic.",
                    human_review_required=True,
                )
            )
            return EvaluationOutcome.REVIEW, findings

        # 1. Rule 1: Missing Wire Identifiers (IPC/WHMA-A-620D §13.1)
        for obs in observations:
            if not obs.wire_id or obs.wire_id.strip() == "":
                findings.append(
                    DeterministicRuleFinding(
                        finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                        rule_id="RULE-WIRE-ID-01",
                        rule_name="Missing Wire Identifier",
                        standard_reference="IPC/WHMA-A-620D §13.1 (Marking/Labeling)",
                        severity=EvaluationSeverity.MAJOR,
                        outcome=EvaluationOutcome.FAIL,
                        title=f"Unlabeled wire segment connected to {obs.source_terminal or obs.component_id or 'unknown terminal'}",
                        reason=f"Candidate wire connection in '{obs.observed_text}' has no discernible wire identifier.",
                        expected_value="Distinct alpha-numeric wire identifier (e.g. W101, W-PWR-01)",
                        detected_value="null / missing wire identifier",
                        evidence_text=obs.observed_text,
                        page_number=obs.page_number,
                        coordinates=obs.coordinates,
                    )
                )

        # 2. Rule 2: Missing Required Attributes: Gauge and Color (IPC/WHMA-A-620D §13.2 & UL 508A §29.1)
        for obs in observations:
            missing_attrs = []
            if not obs.wire_gauge or obs.wire_gauge.strip() == "":
                missing_attrs.append("gauge (AWG)")
            if not obs.wire_color or obs.wire_color.strip() == "":
                missing_attrs.append("insulation color")

            if missing_attrs:
                findings.append(
                    DeterministicRuleFinding(
                        finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                        rule_id="RULE-WIRE-ATTR-02",
                        rule_name="Missing Conductor Specifications",
                        standard_reference="IPC/WHMA-A-620D §13.2 / UL 508A §29.1",
                        severity=EvaluationSeverity.MAJOR,
                        outcome=EvaluationOutcome.FAIL,
                        title=f"Missing wire attributes ({', '.join(missing_attrs)}) on {obs.wire_id or 'unlabeled wire'}",
                        reason=f"Wire specification callout '{obs.observed_text}' lacks required engineering attributes: {', '.join(missing_attrs)}.",
                        expected_value="Explicit gauge and color specification (e.g. '20 AWG BLU')",
                        detected_value=f"Missing: {', '.join(missing_attrs)}",
                        evidence_text=obs.observed_text,
                        page_number=obs.page_number,
                        coordinates=obs.coordinates,
                    )
                )

        # 3. Rule 3: Authoritative Netlist Specification Verification
        # Invariant: An explicitly supplied, certified complete expected netlist is strictly required for PASS.
        if expected_netlist is None:
            findings.append(
                DeterministicRuleFinding(
                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                    rule_id="RULE-SPEC-00",
                    rule_name="Authoritative Expected Netlist Missing",
                    standard_reference="Harness Engineering Specification Control",
                    severity=EvaluationSeverity.WARNING,
                    outcome=EvaluationOutcome.REVIEW,
                    title="Missing Authoritative Expected Netlist",
                    reason="No authoritative expected netlist was supplied for verification. Extracted candidate observations cannot authorize a PASS outcome without an engineering reference specification.",
                    expected_value="Explicit expected netlist connection list",
                    detected_value="None (missing input)",
                    human_review_required=True,
                )
            )
        elif len(expected_netlist) == 0:
            findings.append(
                DeterministicRuleFinding(
                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                    rule_id="RULE-SPEC-01",
                    rule_name="Authoritative Expected Netlist Empty",
                    standard_reference="Harness Engineering Specification Control",
                    severity=EvaluationSeverity.WARNING,
                    outcome=EvaluationOutcome.REVIEW,
                    title="Empty Authoritative Expected Netlist",
                    reason="The supplied expected netlist contains zero wire specifications. A document cannot be verified as PASS against an empty engineering specification.",
                    expected_value="Non-empty expected netlist connection list",
                    detected_value="[] (0 wire connections)",
                    human_review_required=True,
                )
            )
        else:
            # 3a. Check for duplicate wire identifiers in expected netlist
            seen_expected_wires = {}
            for exp in expected_netlist:
                wire_key = exp.wire_id.strip().upper()
                if wire_key in seen_expected_wires:
                    prev = seen_expected_wires[wire_key]
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-SPEC-03",
                            rule_name="Duplicate / Conflicting Expected Wire Specification",
                            standard_reference="Harness Design Specification Control",
                            severity=EvaluationSeverity.CRITICAL,
                            outcome=EvaluationOutcome.FAIL,
                            title=f"Duplicate wire identifier '{exp.wire_id}' in expected netlist",
                            reason=f"Wire identifier '{exp.wire_id}' is specified multiple times in the expected netlist ({prev.expected_source}->{prev.expected_destination} vs {exp.expected_source}->{exp.expected_destination}).",
                            expected_value="Unique wire identifiers across expected netlist",
                            detected_value=f"Duplicate entry for '{exp.wire_id}'",
                        )
                    )
                else:
                    seen_expected_wires[wire_key] = exp

            # 3b. Check specification completeness contract
            if specification_is_complete is not True:
                findings.append(
                    DeterministicRuleFinding(
                        finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                        rule_id="RULE-SPEC-02",
                        rule_name="Specification Completeness Uncertified",
                        standard_reference="Harness Engineering Specification Control",
                        severity=EvaluationSeverity.WARNING,
                        outcome=EvaluationOutcome.REVIEW,
                        title="Expected Netlist Not Certified as Complete Drawing Specification",
                        reason=(
                            "The supplied expected netlist was explicitly marked as a partial specification ('specification_is_complete' = false). A document cannot be verified as PASS against a partial specification."
                            if specification_is_complete is False
                            else "The supplied expected netlist lacks an explicit completeness certification ('specification_is_complete' was not set to true). To prevent unverified outcomes, uncertified specifications fail closed to REVIEW."
                        ),
                        expected_value="specification_is_complete: true",
                        detected_value=f"specification_is_complete: {specification_is_complete}",
                        human_review_required=True,
                    )
                )

            # 3c. Reconcile expected wires against candidate observations
            obs_by_wire = {
                obs.wire_id.strip().upper(): obs
                for obs in observations
                if obs.wire_id and obs.wire_id.strip()
            }

            for exp in expected_netlist:
                wire_key = exp.wire_id.strip().upper()
                if wire_key not in obs_by_wire:
                    # Expected wire not found in candidate observations
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-NETLIST-03",
                            rule_name="Expected Netlist Wire Omission",
                            standard_reference="Harness Design Netlist Verification",
                            severity=EvaluationSeverity.CRITICAL,
                            outcome=EvaluationOutcome.FAIL,
                            title=f"Required wire '{exp.wire_id}' not found in diagram",
                            reason=f"Wire '{exp.wire_id}' ({exp.expected_source} -> {exp.expected_destination}) was specified in expected netlist but not detected in diagram.",
                            expected_value=f"{exp.wire_id}: {exp.expected_source} -> {exp.expected_destination}",
                            detected_value="Not detected on rendered sheets",
                        )
                    )
                else:
                    matched_obs = obs_by_wire[wire_key]

                    # Check source terminal mismatch
                    if exp.expected_source:
                        norm_exp_src = exp.expected_source.strip().upper()
                        norm_det_src = (matched_obs.source_terminal or "").strip().upper()
                        if not norm_det_src or norm_det_src != norm_exp_src:
                            findings.append(
                                DeterministicRuleFinding(
                                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                                    rule_id="RULE-NETLIST-04",
                                    rule_name="Source Terminal Mismatch",
                                    standard_reference="Harness Point-to-Point Continuity",
                                    severity=EvaluationSeverity.CRITICAL,
                                    outcome=EvaluationOutcome.FAIL,
                                    title=f"Terminal mismatch on source of '{exp.wire_id}'",
                                    reason=f"Wire '{exp.wire_id}' is routed to '{matched_obs.source_terminal or 'missing terminal'}' instead of specified '{exp.expected_source}'.",
                                    expected_value=exp.expected_source,
                                    detected_value=matched_obs.source_terminal or "null / missing terminal",
                                    evidence_text=matched_obs.observed_text,
                                    page_number=matched_obs.page_number,
                                    coordinates=matched_obs.coordinates,
                                )
                            )

                    # Check destination terminal mismatch
                    if exp.expected_destination:
                        norm_exp_dst = exp.expected_destination.strip().upper()
                        norm_det_dst = (matched_obs.destination_terminal or "").strip().upper()
                        if not norm_det_dst or norm_det_dst != norm_exp_dst:
                            findings.append(
                                DeterministicRuleFinding(
                                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                                    rule_id="RULE-NETLIST-05",
                                    rule_name="Destination Terminal Mismatch",
                                    standard_reference="Harness Point-to-Point Continuity",
                                    severity=EvaluationSeverity.CRITICAL,
                                    outcome=EvaluationOutcome.FAIL,
                                    title=f"Terminal mismatch on destination of '{exp.wire_id}'",
                                    reason=f"Wire '{exp.wire_id}' is routed to '{matched_obs.destination_terminal or 'missing terminal'}' instead of specified '{exp.expected_destination}'.",
                                    expected_value=exp.expected_destination,
                                    detected_value=matched_obs.destination_terminal or "null / missing terminal",
                                    evidence_text=matched_obs.observed_text,
                                    page_number=matched_obs.page_number,
                                    coordinates=matched_obs.coordinates,
                                )
                            )

                    # Check gauge mismatch
                    if exp.expected_gauge and matched_obs.wire_gauge:
                        norm_exp_gauge = exp.expected_gauge.replace(" ", "").upper()
                        norm_det_gauge = matched_obs.wire_gauge.replace(" ", "").upper()
                        if norm_exp_gauge != norm_det_gauge and norm_exp_gauge not in norm_det_gauge:
                            findings.append(
                                DeterministicRuleFinding(
                                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                                    rule_id="RULE-NETLIST-06",
                                    rule_name="Conductor Gauge Mismatch",
                                    standard_reference="UL 508A Ampacity / Sizing",
                                    severity=EvaluationSeverity.MAJOR,
                                    outcome=EvaluationOutcome.FAIL,
                                    title=f"Gauge mismatch on wire '{exp.wire_id}'",
                                    reason=f"Wire '{exp.wire_id}' specifies {matched_obs.wire_gauge} in schematic but requires {exp.expected_gauge} in netlist.",
                                    expected_value=exp.expected_gauge,
                                    detected_value=matched_obs.wire_gauge,
                                    evidence_text=matched_obs.observed_text,
                                    page_number=matched_obs.page_number,
                                    coordinates=matched_obs.coordinates,
                                )
                            )

                    # Check color mismatch
                    if exp.expected_color and matched_obs.wire_color:
                        norm_exp_color = exp.expected_color.replace(" ", "").upper()
                        norm_det_color = matched_obs.wire_color.replace(" ", "").upper()
                        if norm_exp_color != norm_det_color and norm_exp_color not in norm_det_color:
                            findings.append(
                                DeterministicRuleFinding(
                                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                                    rule_id="RULE-NETLIST-07",
                                    rule_name="Conductor Color Mismatch",
                                    standard_reference="IPC/WHMA-A-620D §13.2",
                                    severity=EvaluationSeverity.MINOR,
                                    outcome=EvaluationOutcome.FAIL,
                                    title=f"Color mismatch on wire '{exp.wire_id}'",
                                    reason=f"Wire '{exp.wire_id}' specifies {matched_obs.wire_color} in schematic but requires {exp.expected_color} in netlist.",
                                    expected_value=exp.expected_color,
                                    detected_value=matched_obs.wire_color,
                                    evidence_text=matched_obs.observed_text,
                                    page_number=matched_obs.page_number,
                                    coordinates=matched_obs.coordinates,
                                )
                            )

            # 3d. If specification is certified complete, reconcile candidate observations for unlisted wires
            if specification_is_complete is True:
                expected_wire_keys = {exp.wire_id.strip().upper() for exp in expected_netlist}
                seen_unlisted = set()
                for obs in observations:
                    if obs.wire_id and obs.wire_id.strip():
                        obs_wire_key = obs.wire_id.strip().upper()
                        if obs_wire_key not in expected_wire_keys and obs_wire_key not in seen_unlisted:
                            seen_unlisted.add(obs_wire_key)
                            findings.append(
                                DeterministicRuleFinding(
                                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                                    rule_id="RULE-NETLIST-09",
                                    rule_name="Unlisted Candidate Wire Detected",
                                    standard_reference="Harness Complete Netlist Reconciliation",
                                    severity=EvaluationSeverity.WARNING,
                                    outcome=EvaluationOutcome.REVIEW,
                                    title=f"Unlisted wire '{obs.wire_id}' detected on diagram",
                                    reason=f"Candidate wire '{obs.wire_id}' was observed in diagram ('{obs.observed_text}') but is not present in the certified complete expected netlist.",
                                    expected_value="All diagram wires accounted for in certified netlist",
                                    detected_value=f"Unlisted wire: {obs.wire_id}",
                                    evidence_text=obs.observed_text,
                                    page_number=obs.page_number,
                                    coordinates=obs.coordinates,
                                    human_review_required=True,
                                )
                            )

            # 3e. Check extraction completeness contract
            # Invariant: A vision model alone cannot prove its own negative (i.e. that no other wires exist on the drawing).
            # A caller-supplied boolean alone NEVER constitutes independent extraction verification.
            # Unresolved extraction coverage must fail closed to REVIEW unless confirmed deterministic defects require FAIL.
            extraction_coverage_confirmed = False

            if trusted_verification is not None:
                # Validate trusted verification record
                if trusted_verification.verification_method == VerificationMethod.MODEL_SELF_ATTESTATION:
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-EXTRACT-00",
                            rule_name="Model Self-Attestation Inadmissible",
                            standard_reference="SpanQC Visual Extraction Verification Protocol §2.1",
                            severity=EvaluationSeverity.WARNING,
                            outcome=EvaluationOutcome.REVIEW,
                            title="Vision Model Cannot Attest Its Own Extraction Completeness",
                            reason=(
                                "The extraction verification record cited model self-attestation ('MODEL_SELF_ATTESTATION'). "
                                "A vision model cannot prove its own negative or certify that it did not silently omit drawing elements. "
                                "Extraction coverage requires independent human inspection or deterministic CAD vector reconciliation."
                            ),
                            expected_value="INDEPENDENT_HUMAN_INSPECTION or DETERMINISTIC_CAD_VECTOR_RECONCILIATION",
                            detected_value="MODEL_SELF_ATTESTATION",
                            human_review_required=True,
                        )
                    )
                elif not trusted_verification.verifier_id or not trusted_verification.verifier_id.strip():
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-EXTRACT-00",
                            rule_name="Unauthenticated Verifier Identity",
                            standard_reference="SpanQC Visual Extraction Verification Protocol §2.1",
                            severity=EvaluationSeverity.WARNING,
                            outcome=EvaluationOutcome.REVIEW,
                            title="Extraction Verification Lacks Verifier Identity",
                            reason="The extraction verification record does not identify an authenticated reviewer or verification authority.",
                            expected_value="Non-empty authenticated verifier_id",
                            detected_value="null / empty verifier_id",
                            human_review_required=True,
                        )
                    )
                elif (
                    document_sha256
                    and trusted_verification.document_sha256
                    and document_sha256.lower() != trusted_verification.document_sha256.lower()
                ):
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-EXTRACT-00",
                            rule_name="Verification Document Digest Mismatch",
                            standard_reference="SpanQC Visual Extraction Verification Protocol §2.1",
                            severity=EvaluationSeverity.WARNING,
                            outcome=EvaluationOutcome.REVIEW,
                            title="Verification Record Bound to Different Document Digest",
                            reason=(
                                f"The extraction verification record is bound to document SHA-256 '{trusted_verification.document_sha256}', "
                                f"which does not match the evaluated document digest '{document_sha256}'."
                            ),
                            expected_value=document_sha256,
                            detected_value=trusted_verification.document_sha256,
                            human_review_required=True,
                        )
                    )
                elif (
                    scope_description
                    and trusted_verification.verified_scope
                    and scope_description.strip().lower() != trusted_verification.verified_scope.strip().lower()
                ):
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-EXTRACT-00",
                            rule_name="Verification Scope Mismatch",
                            standard_reference="SpanQC Visual Extraction Verification Protocol §2.1",
                            severity=EvaluationSeverity.WARNING,
                            outcome=EvaluationOutcome.REVIEW,
                            title="Verification Record Bound to Different Drawing Scope",
                            reason=(
                                f"The extraction verification record covers scope '{trusted_verification.verified_scope}', "
                                f"which does not match declared specification scope '{scope_description}'."
                            ),
                            expected_value=scope_description,
                            detected_value=trusted_verification.verified_scope,
                            human_review_required=True,
                        )
                    )
                else:
                    extraction_coverage_confirmed = True
            else:
                # No trusted verification record provided
                if extraction_is_verified is True:
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-EXTRACT-00",
                            rule_name="Caller Extraction Assertion Untrusted",
                            standard_reference="SpanQC Visual Extraction Verification Protocol §2.1",
                            severity=EvaluationSeverity.WARNING,
                            outcome=EvaluationOutcome.REVIEW,
                            title="Client-Supplied Extraction Verification Is Untrusted",
                            reason=(
                                "Caller-supplied assertion ('extraction_is_verified' = true) is untrusted client metadata "
                                "and does not constitute independent verification evidence. "
                                "A client-supplied boolean cannot authorize PASS without an authenticated reviewer identity "
                                "or independent coverage verification record bound to this document."
                            ),
                            expected_value="TrustedExtractionVerification record (authenticated reviewer or deterministic CAD reconciliation)",
                            detected_value="Caller-supplied boolean: true (untrusted metadata)",
                            human_review_required=True,
                        )
                    )
                else:
                    findings.append(
                        DeterministicRuleFinding(
                            finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                            rule_id="RULE-EXTRACT-00",
                            rule_name="Extraction Coverage Unverified",
                            standard_reference="SpanQC Visual Extraction Verification Protocol §2.1",
                            severity=EvaluationSeverity.WARNING,
                            outcome=EvaluationOutcome.REVIEW,
                            title="Drawing Extraction Coverage Unverified",
                            reason=(
                                "Vision model candidate extraction alone cannot prove that all conductors in the diagram were detected. "
                                "Without verified extraction coverage backed by trusted verification evidence, "
                                "a scope-level PASS cannot be guaranteed against silent model omission."
                            ),
                            expected_value="TrustedExtractionVerification record",
                            detected_value=f"extraction_is_verified: {extraction_is_verified}",
                            human_review_required=True,
                        )
                    )

        # 4. Rule 4: Ambiguity & Low-Confidence Evidence (Human Review Trigger)
        for obs in observations:
            ambiguity_flags = []
            if obs.requires_human_review:
                ambiguity_flags.append("Flagged by model as requiring review")
            if obs.ambiguity_reasons:
                ambiguity_flags.extend(obs.ambiguity_reasons)
            if obs.confidence_score < 0.70:
                ambiguity_flags.append(f"Low confidence ({int(obs.confidence_score * 100)}%)")

            if ambiguity_flags:
                findings.append(
                    DeterministicRuleFinding(
                        finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                        rule_id="RULE-AMBIGUITY-08",
                        rule_name="Visual Ambiguity Requires Human Inspector Arbitration",
                        standard_reference="SpanQC Quality Arbitration Protocol §4.1",
                        severity=EvaluationSeverity.WARNING,
                        outcome=EvaluationOutcome.REVIEW,
                        title=f"Ambiguity detected on candidate observation '{obs.wire_id or obs.observation_id}'",
                        reason=f"Unclear visual evidence: {'; '.join(ambiguity_flags)}.",
                        detected_value=f"Confidence: {int(obs.confidence_score * 100)}%, Ambiguities: {len(ambiguity_flags)}",
                        evidence_text=obs.observed_text,
                        page_number=obs.page_number,
                        coordinates=obs.coordinates,
                        human_review_required=True,
                    )
                )

        # 5. Rule 5: Page Coverage & Processing Completeness
        if unprocessed_page_numbers:
            findings.append(
                DeterministicRuleFinding(
                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                    rule_id="RULE-PAGE-COVERAGE-01",
                    rule_name="Document Page Limit Exceeded",
                    standard_reference="SpanQC Document Coverage Verification §3.1",
                    severity=EvaluationSeverity.WARNING,
                    outcome=EvaluationOutcome.REVIEW,
                    title="Unprocessed Pages Exceed Configured Ingestion Limit",
                    reason=(
                        f"Document contains {total_page_count or 'multiple'} pages, but only "
                        f"{processed_page_count or 'some'} were processed. Pages {unprocessed_page_numbers} "
                        f"were not analyzed. Complete declared drawing scope must be processed before PASS can be certified."
                    ),
                    expected_value="All document pages processed",
                    detected_value=f"Unprocessed pages: {unprocessed_page_numbers}",
                    human_review_required=True,
                )
            )

        if failed_page_numbers:
            findings.append(
                DeterministicRuleFinding(
                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                    rule_id="RULE-PAGE-COVERAGE-02",
                    rule_name="Page Candidate Extraction Failure",
                    standard_reference="SpanQC Document Coverage Verification §3.2",
                    severity=EvaluationSeverity.WARNING,
                    outcome=EvaluationOutcome.REVIEW,
                    title="Inference Failed on One or More Pages",
                    reason=(
                        f"Visual extraction failed on page(s) {failed_page_numbers}. "
                        "Partial page processing cannot prove absence of wiring defects and blocks scope-level PASS."
                    ),
                    expected_value="Successful extraction across all declared pages",
                    detected_value=f"Failed pages: {failed_page_numbers}",
                    human_review_required=True,
                )
            )

        # 6. Determine Overall Outcome
        has_fail = any(f.outcome == EvaluationOutcome.FAIL for f in findings)
        has_review = any(f.outcome == EvaluationOutcome.REVIEW for f in findings)

        if has_fail:
            overall_outcome = EvaluationOutcome.FAIL
        elif has_review:
            overall_outcome = EvaluationOutcome.REVIEW
        else:
            # Positive PASS confirmation only if checks executed with certified complete netlist,
            # trusted extraction verification evidence, and zero unlisted wires
            overall_outcome = EvaluationOutcome.PASS
            netlist_count = len(expected_netlist) if expected_netlist else 0
            verifier_desc = (
                f"by {trusted_verification.verifier_id} ({trusted_verification.verification_method.value})"
                if trusted_verification
                else "verified"
            )
            findings.append(
                DeterministicRuleFinding(
                    finding_id=f"FND-{uuid.uuid4().hex[:6].upper()}",
                    rule_id="RULE-PASS-00",
                    rule_name="Deterministic Netlist & Attribute Conformance",
                    standard_reference=standard,
                    severity=EvaluationSeverity.INFO,
                    outcome=EvaluationOutcome.PASS,
                    title="All Required Netlist & Conductor Rules Verified",
                    reason=f"Successfully verified all {len(observations)} candidate connections against {netlist_count} certified complete netlist wires and {standard} standards with trusted extraction verification {verifier_desc}, zero unlisted wires, and zero visual ambiguities.",
                )
            )

        return overall_outcome, findings
