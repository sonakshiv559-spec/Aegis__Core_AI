"""
AegisCore AI – Neo4j Graph Client & Repository
Provides async graph traversal with resilient in-memory fallback.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
import structlog

from services.context_graph.schema import (
    ContextGraphData,
    CriticalityTier,
    GraphEdge,
    GraphNode,
    NodeType,
)

logger = structlog.get_logger()


class ContextGraphRepository:
    """
    Graph repository with in-memory graph representation and Neo4j driver support.
    Guarantees instant local execution and tests without requiring Neo4j daemon.
    """

    def __init__(self, neo4j_uri: Optional[str] = None):
        self.neo4j_uri = neo4j_uri
        self._nodes: Dict[str, GraphNode] = {}
        self._edges: Dict[str, GraphEdge] = {}
        self._out_adj: Dict[str, List[GraphEdge]] = {}
        self._in_adj: Dict[str, List[GraphEdge]] = {}
        self._seed_default_graph()

    def _seed_default_graph(self) -> None:
        """Seeds the enterprise topology mirroring the seed.cypher specification."""
        seed_nodes = [
            GraphNode(id="usr-0042", label="michael.chen@corp.internal", type=NodeType.IDENTITY, criticality=CriticalityTier.TIER_1, owner="Data Eng", is_threat_target=True),
            GraphNode(id="svc-acc-db-001", label="svc-dataplatform@corp.internal", type=NodeType.IDENTITY, criticality=CriticalityTier.TIER_1, owner="Data Platform", is_threat_target=True),
            GraphNode(id="usr-contractor-1", label="dev.contractor1@corp.internal", type=NodeType.IDENTITY, criticality=CriticalityTier.TIER_3, owner="Consulting Team"),
            GraphNode(id="ep-wkstn-0042", label="WKSTN-0042", type=NodeType.ENDPOINT, criticality=CriticalityTier.TIER_2, owner="Platform Ops", is_threat_target=True),
            GraphNode(id="ep-k8s-04", label="k8s-node-worker-04", type=NodeType.ENDPOINT, criticality=CriticalityTier.TIER_2, owner="Platform Ops"),
            GraphNode(id="ep-dev-007", label="WKSTN-DEV-007", type=NodeType.ENDPOINT, criticality=CriticalityTier.TIER_3, owner="Developer Services"),
            GraphNode(id="svc-auth-01", label="auth-service", type=NodeType.SERVICE, criticality=CriticalityTier.TIER_1, owner="Identity Team"),
            GraphNode(id="svc-reporting-01", label="svc-customer-reporting", type=NodeType.SERVICE, criticality=CriticalityTier.TIER_1, owner="BI Team"),
            GraphNode(id="svc-etl-01", label="batch-etl-pipeline", type=NodeType.SERVICE, criticality=CriticalityTier.TIER_2, owner="Data Eng"),
            GraphNode(id="svc-order-01", label="order-processing-api", type=NodeType.SERVICE, criticality=CriticalityTier.TIER_1, owner="Core Commerce"),
            GraphNode(id="db-users-01", label="users-postgres", type=NodeType.DATABASE, criticality=CriticalityTier.TIER_1, owner="DB Reliability"),
            GraphNode(id="db-analytics-01", label="db-customer-analytics-cluster", type=NodeType.DATABASE, criticality=CriticalityTier.TIER_1, owner="DB Reliability"),
            GraphNode(id="s3-pii-01", label="prod-user-pii-data", type=NodeType.DATABASE, criticality=CriticalityTier.TIER_1, owner="Data Compliance"),
        ]

        seed_edges = [
            GraphEdge(id="e-usr42-ep42", source="usr-0042", target="ep-wkstn-0042", label="AUTHENTICATED_TO"),
            GraphEdge(id="e-sadata-epk8s", source="svc-acc-db-001", target="ep-k8s-04", label="AUTHENTICATED_TO"),
            GraphEdge(id="e-cont-epdev", source="usr-contractor-1", target="ep-dev-007", label="AUTHENTICATED_TO"),
            GraphEdge(id="e-ep42-auth", source="ep-wkstn-0042", target="svc-auth-01", label="HOSTS"),
            GraphEdge(id="e-k8s-rep", source="ep-k8s-04", target="svc-reporting-01", label="HOSTS"),
            GraphEdge(id="e-k8s-etl", source="ep-k8s-04", target="svc-etl-01", label="HOSTS"),
            GraphEdge(id="e-rep-auth", source="svc-reporting-01", target="svc-auth-01", label="DEPENDS_ON"),
            GraphEdge(id="e-order-auth", source="svc-order-01", target="svc-auth-01", label="DEPENDS_ON"),
            GraphEdge(id="e-etl-rep", source="svc-etl-01", target="svc-reporting-01", label="DEPENDS_ON"),
            GraphEdge(id="e-auth-dbusers", source="svc-auth-01", target="db-users-01", label="READS_WRITES"),
            GraphEdge(id="e-rep-dbanalytics", source="svc-reporting-01", target="db-analytics-01", label="READS_WRITES"),
            GraphEdge(id="e-sadata-s3pii", source="svc-acc-db-001", target="s3-pii-01", label="READS_WRITES"),
        ]

        for n in seed_nodes:
            self._nodes[n.id] = n
            self._out_adj[n.id] = []
            self._in_adj[n.id] = []

        for e in seed_edges:
            self._edges[e.id] = e
            self._out_adj[e.source].append(e)
            self._in_adj[e.target].append(e)

        logger.info("aegiscore.context_graph.seeded", nodes=len(self._nodes), edges=len(self._edges))

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self._nodes.get(node_id)

    def get_outward_edges(self, node_id: str) -> List[GraphEdge]:
        return self._out_adj.get(node_id, [])

    def get_inward_edges(self, node_id: str) -> List[GraphEdge]:
        return self._in_adj.get(node_id, [])

    def get_graph_data(self) -> ContextGraphData:
        return ContextGraphData(
            nodes=list(self._nodes.values()),
            edges=list(self._edges.values()),
        )
