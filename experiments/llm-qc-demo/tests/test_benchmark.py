import pytest
from benchmark.benchmark_runner import run_all_deterministic_cases

def test_deterministic_benchmark_suite():
    report = run_all_deterministic_cases()
    assert report.total_cases == 12
    assert report.mismatched_cases == 0
    assert report.accuracy_percent == 100.0
    for case in report.cases:
        assert case.outcome_matched is True, f"Benchmark {case.case_id} failed: expected {case.expected_outcome}, got {case.actual_outcome}"
