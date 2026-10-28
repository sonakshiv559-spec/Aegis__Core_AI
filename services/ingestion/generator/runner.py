"""
AegisCore AI – Synthetic Event Generator Runner

CLI tool to pump synthetic events through the ingestion pipeline.
Can target:
  (a) Live FastAPI API endpoint (HTTP POST)
  (b) Direct pipeline (in-process, no DB/Redis/MinIO required)

Usage:
    # Send all scenarios to the running API:
    python runner.py --mode api --url http://localhost:8000

    # Test a specific scenario directly:
    python runner.py --mode direct --scenario 1_token_reuse

    # Send all scenarios directly and print results:
    python runner.py --mode direct --all
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import os
from typing import Dict, Any, List

# Allow running from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

from services.ingestion.generator.scenarios import ALL_SCENARIOS, get_all_events, get_scenario_events
from services.ingestion.normalizer import EventNormalizer
from services.ingestion.deduplicator import EventDeduplicator
from services.ingestion.validator import SchemaValidator
from services.ingestion.archiver import RawEventArchiver


def run_direct_pipeline(
    events: List[Dict[str, Any]],
    tenant_id: str = "tenant-aegis-production-us-east",
) -> Dict[str, Any]:
    """
    Runs events through the normalizer + validator locally (no DB/Redis/MinIO).
    Useful for adapter validation and unit testing.
    """
    normalizer = EventNormalizer(default_tenant_id=tenant_id)
    validator = SchemaValidator(expected_tenant_id=tenant_id)

    results = {
        "total": len(events),
        "accepted": 0,
        "rejected": 0,
        "no_adapter": 0,
        "details": [],
    }

    for i, raw in enumerate(events):
        norm = normalizer.normalize(raw, tenant_id=tenant_id)
        if not norm.is_valid:
            failure = norm.failure
            results["rejected"] += 1
            if failure.failure_code == "NO_ADAPTER":
                results["no_adapter"] += 1
            results["details"].append({
                "index": i,
                "status": "REJECTED",
                "code": failure.failure_code,
                "reason": failure.failure_reason[:120],
                "source": failure.source_product,
            })
            continue

        val = validator.validate(norm.event, raw)
        if not val.is_valid:
            results["rejected"] += 1
            results["details"].append({
                "index": i,
                "status": "REJECTED",
                "code": val.failure.failure_code,
                "reason": val.failure.failure_reason[:120],
            })
            continue

        results["accepted"] += 1
        results["details"].append({
            "index": i,
            "status": "ACCEPTED",
            "event_id": norm.event.event_id,
            "source": norm.event.source_product,
            "class": norm.event.event_class,
            "activity": norm.event.activity_name,
            "outcome": norm.event.outcome,
            "warnings": val.warnings,
        })

    return results


async def run_api_mode(
    events: List[Dict[str, Any]],
    api_url: str,
    batch_size: int = 50,
) -> None:
    """Sends events to the live FastAPI endpoint in batches."""
    try:
        import httpx
    except ImportError:
        print("httpx not installed. Run: pip install httpx")
        return

    url = f"{api_url.rstrip('/')}/api/v1/events/ingest"
    total_sent = 0
    total_batches = (len(events) + batch_size - 1) // batch_size

    async with httpx.AsyncClient(timeout=30.0) as client:
        for batch_num in range(0, len(events), batch_size):
            batch = events[batch_num: batch_num + batch_size]
            current_batch = batch_num // batch_size + 1
            try:
                resp = await client.post(url, json=batch)
                resp.raise_for_status()
                data = resp.json()
                print(f"  Batch {current_batch}/{total_batches}: {data}")
                total_sent += len(batch)
            except Exception as exc:
                print(f"  Batch {current_batch}/{total_batches} FAILED: {exc}")

    print(f"\n✓ Sent {total_sent}/{len(events)} events to {url}")


def main():
    parser = argparse.ArgumentParser(description="AegisCore Synthetic Event Generator")
    parser.add_argument(
        "--mode", choices=["api", "direct"], default="direct",
        help="'api' sends to FastAPI endpoint; 'direct' runs in-process"
    )
    parser.add_argument(
        "--scenario", type=str, default=None,
        help=f"Scenario ID to run. Available: {', '.join(ALL_SCENARIOS.keys())}"
    )
    parser.add_argument("--all", action="store_true", help="Run all scenarios")
    parser.add_argument("--url", type=str, default="http://localhost:8000", help="API base URL")
    parser.add_argument("--tenant", type=str, default="tenant-aegis-production-us-east")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    # Select events
    if args.all or (not args.scenario):
        events = get_all_events()
        label = "ALL SCENARIOS"
    else:
        events = get_scenario_events(args.scenario)
        label = f"SCENARIO {args.scenario}"

    print(f"\n{'='*60}")
    print(f"  AegisCore Synthetic Event Generator")
    print(f"  Mode: {args.mode.upper()} | {label} ({len(events)} events)")
    print(f"{'='*60}\n")

    if args.mode == "direct":
        results = run_direct_pipeline(events, tenant_id=args.tenant)
        print(f"Total:    {results['total']}")
        print(f"Accepted: {results['accepted']}")
        print(f"Rejected: {results['rejected']} (no_adapter: {results['no_adapter']})")
        print()
        if args.verbose:
            for detail in results["details"]:
                status_icon = "✓" if detail["status"] == "ACCEPTED" else "✗"
                print(f"  {status_icon} [{detail['index']:02d}] {detail.get('source','?'):25s} "
                      f"{detail.get('class',''):20s} → {detail['status']}")
                if detail.get("warnings"):
                    for w in detail["warnings"]:
                        print(f"      ⚠  {w[:100]}")
                if detail["status"] == "REJECTED":
                    print(f"      ✗  [{detail.get('code')}] {detail.get('reason','')}")
        else:
            # Summary by scenario
            for scenario_id, scenario_events in ALL_SCENARIOS.items():
                start = sum(len(v) for k, v in ALL_SCENARIOS.items() if k < scenario_id)
                s_results = results["details"][start: start + len(scenario_events)]
                accepted = sum(1 for r in s_results if r["status"] == "ACCEPTED")
                print(f"  Scenario {scenario_id}: {accepted}/{len(scenario_events)} accepted")

    else:
        asyncio.run(run_api_mode(events, api_url=args.url))

    print("\nDone.")


if __name__ == "__main__":
    main()
