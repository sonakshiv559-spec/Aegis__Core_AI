"""
AegisCore AI – Context Graph & Blast Radius Router
Exposes live graph topology and BFS blast radius simulation endpoints.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
import structlog

from services.context_graph.client import ContextGraphRepository
from services.risk.blast_radius import BlastRadiusCalculator
from services.risk.action_planner import ActionPlanner

logger = structlog.get_logger()
router = APIRouter()

_repo = ContextGraphRepository()
_blast_calc = BlastRadiusCalculator(graph_repo=_repo)
_planner = ActionPlanner(blast_calculator=_blast_calc)


@router.get(
    "/graph",
    summary="Get full asset & service dependency graph",
    description="Returns full Neo4j enterprise topology formatted for React Flow visualization.",
)
async def get_graph():
    graph_data = _repo.get_graph_data()
    return graph_data.to_react_flow_graph()


@router.get(
    "/graph/{entity_id}/blast-radius",
    summary="Simulate containment action blast radius",
    description="Runs BFS graph traversal to quantify disrupted downstream services and disruption cost.",
)
async def simulate_blast_radius(
    entity_id: str,
    action_type: str = Query("IsolateEndpoint", description="Candidate action type to simulate"),
):
    report = _blast_calc.calculate_blast_radius(entity_id, action_type)
    return {
        "target_entity_id": report.target_entity_id,
        "action_type": report.action_type,
        "disrupted_services": report.disrupted_services,
        "business_disruption_cost": report.business_disruption_cost,
        "blast_radius_score": report.blast_radius_score,
        "max_dependency_depth": report.max_dependency_depth,
        "impacted_node_count": len(report.impacted_nodes),
    }
