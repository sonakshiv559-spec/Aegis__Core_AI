"""
AegisCore AI – Blast Radius Quantification Engine (USP 1)
Traverses the dependency subgraph in Neo4j to quantify downstream operational collateral damage
before any disruptive containment action is authorized or executed.
"""

from __future__ import annotations

from collections import deque
from typing import Dict, List, Optional, Set
import structlog

from services.context_graph.client import ContextGraphRepository
from services.context_graph.schema import CriticalityTier, GraphNode, NodeType

logger = structlog.get_logger()


CRITICALITY_COST_WEIGHTS = {
    CriticalityTier.TIER_1: 0.40,  # Mission Critical
    CriticalityTier.TIER_2: 0.15,  # Standard Business
    CriticalityTier.TIER_3: 0.05,  # Low / Dev
}


class BlastRadiusReport:
    def __init__(
        self,
        target_entity_id: str,
        action_type: str,
        disrupted_services: List[str],
        impacted_nodes: List[GraphNode],
        business_disruption_cost: float,
        blast_radius_score: float,
        max_dependency_depth: int,
    ):
        self.target_entity_id = target_entity_id
        self.action_type = action_type
        self.disrupted_services = disrupted_services
        self.impacted_nodes = impacted_nodes
        self.business_disruption_cost = business_disruption_cost
        self.blast_radius_score = blast_radius_score
        self.max_dependency_depth = max_dependency_depth


class BlastRadiusCalculator:
    """
    Evaluates blast radius using Breadth-First Search (BFS) graph traversal.
    Differentiates between targeted actions (e.g. token revocation) and broad
    containment actions (e.g. endpoint isolation, network segmentation).
    """

    def __init__(self, graph_repo: Optional[ContextGraphRepository] = None):
        self.graph = graph_repo or ContextGraphRepository()

    def calculate_blast_radius(
        self, target_entity_id: str, action_type: str
    ) -> BlastRadiusReport:
        # High-reversibility, targeted identity actions have minimal blast radius
        if action_type in ("RevokeUserSession", "RevokeToken", "ResetPassword"):
            logger.info("aegiscore.blast_radius.targeted_action", entity=target_entity_id, action=action_type)
            return BlastRadiusReport(
                target_entity_id=target_entity_id,
                action_type=action_type,
                disrupted_services=[],
                impacted_nodes=[],
                business_disruption_cost=0.10,
                blast_radius_score=0.05,
                max_dependency_depth=0,
            )

        # Broad containment: Endpoint isolation or Network cutoff
        target_node = self.graph.get_node(target_entity_id)
        if not target_node:
            logger.warning("aegiscore.blast_radius.node_not_found", target_id=target_entity_id)
            return BlastRadiusReport(
                target_entity_id=target_entity_id,
                action_type=action_type,
                disrupted_services=[],
                impacted_nodes=[],
                business_disruption_cost=0.50,
                blast_radius_score=0.50,
                max_dependency_depth=0,
            )

        visited: Set[str] = {target_entity_id}
        queue = deque([(target_entity_id, 0)])
        impacted_nodes: List[GraphNode] = []
        disrupted_services: List[str] = []
        total_cost = 0.0
        max_depth = 0

        while queue:
            curr_id, depth = queue.popleft()
            if depth > max_depth:
                max_depth = depth

            # Check outbound edges (e.g. Endpoint HOSTS Service, Service READS_WRITES DB)
            for edge in self.graph.get_outward_edges(curr_id):
                neighbor_id = edge.target
                if neighbor_id not in visited:
                    visited.add(neighbor_id)
                    neighbor_node = self.graph.get_node(neighbor_id)
                    if neighbor_node:
                        impacted_nodes.append(neighbor_node)
                        queue.append((neighbor_id, depth + 1))
                        # Add cost
                        cost = CRITICALITY_COST_WEIGHTS.get(neighbor_node.criticality, 0.10)
                        total_cost += cost
                        if neighbor_node.type == NodeType.SERVICE:
                            disrupted_services.append(neighbor_node.label)

            # Check inward DEPENDS_ON edges (e.g. other services that depend on this service)
            curr_node = self.graph.get_node(curr_id)
            if curr_node and curr_node.type == NodeType.SERVICE:
                for edge in self.graph.get_inward_edges(curr_id):
                    if edge.label == "DEPENDS_ON":
                        dependent_id = edge.source
                        if dependent_id not in visited:
                            visited.add(dependent_id)
                            dependent_node = self.graph.get_node(dependent_id)
                            if dependent_node:
                                impacted_nodes.append(dependent_node)
                                queue.append((dependent_id, depth + 1))
                                cost = CRITICALITY_COST_WEIGHTS.get(dependent_node.criticality, 0.10)
                                total_cost += cost
                                if dependent_node.type == NodeType.SERVICE:
                                    disrupted_services.append(dependent_node.label)

        # Normalize score between 0.0 and 1.0
        normalized_cost = min(0.95, round(total_cost, 2))
        blast_score = min(0.95, round(len(impacted_nodes) * 0.15, 2))

        logger.info(
            "aegiscore.blast_radius.computed",
            target=target_entity_id,
            action=action_type,
            disrupted_count=len(disrupted_services),
            cost=normalized_cost,
        )

        return BlastRadiusReport(
            target_entity_id=target_entity_id,
            action_type=action_type,
            disrupted_services=disrupted_services,
            impacted_nodes=impacted_nodes,
            business_disruption_cost=normalized_cost,
            blast_radius_score=blast_score,
            max_dependency_depth=max_depth,
        )
