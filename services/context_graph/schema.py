"""
AegisCore AI – Context Graph Schema Models
Models organizational nodes and edges compatible with Neo4j and React Flow frontend visualizers.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    IDENTITY = "identity"
    ENDPOINT = "endpoint"
    SERVICE = "service"
    DATABASE = "database"
    TEAM = "team"
    NETWORK_ZONE = "network_zone"


class CriticalityTier(str, Enum):
    TIER_1 = "Tier 1"  # Mission Critical (outage disrupts enterprise operations)
    TIER_2 = "Tier 2"  # Standard Business
    TIER_3 = "Tier 3"  # Low Impact / Development / Sandbox


class GraphNode(BaseModel):
    id: str
    label: str
    type: NodeType
    criticality: CriticalityTier = CriticalityTier.TIER_2
    owner: Optional[str] = None
    is_threat_target: bool = False
    is_disrupted_by_action: bool = False
    properties: Dict[str, Any] = Field(default_factory=dict)

    def to_react_flow(self, x: float = 0.0, y: float = 0.0) -> Dict[str, Any]:
        """Maps node to React Flow visualizer schema."""
        return {
            "id": self.id,
            "type": "default",
            "position": {"x": x, "y": y},
            "data": {
                "label": f"{self.label} ({self.type.value.capitalize()})",
                "type": self.type.value,
                "criticality": self.criticality.value,
                "owner": self.owner or "Unassigned",
                "isThreatTarget": self.is_threat_target,
                "isDisruptedByAction": self.is_disrupted_by_action,
            },
        }


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str  # AUTHENTICATED_TO | HOSTS | DEPENDS_ON | READS_WRITES | OWNS | LOCATED_IN
    properties: Dict[str, Any] = Field(default_factory=dict)

    def to_react_flow(self) -> Dict[str, Any]:
        """Maps edge to React Flow visualizer schema."""
        return {
            "id": self.id,
            "source": self.source,
            "target": self.target,
            "label": self.label,
            "animated": self.label == "AUTHENTICATED_TO",
        }


class ContextGraphData(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)

    def to_react_flow_graph(self) -> Dict[str, Any]:
        """Returns standard {nodes: [...], edges: [...]} for React Flow."""
        return {
            "nodes": [n.to_react_flow() for n in self.nodes],
            "edges": [e.to_react_flow() for e in self.edges],
        }
