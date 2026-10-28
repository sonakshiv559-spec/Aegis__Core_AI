"""AegisCore detection service package."""
from services.detection.rules import RuleEngine, DetectionRule, RuleMatchResult
from services.detection.features import EventFeatureExtractor
from services.detection.anomaly import AnomalyDetector
from services.detection.lifecycle import IncidentStateMachine, InvalidStateTransitionError
from services.detection.correlator import IncidentCorrelator
from services.detection.engine import DetectionEngine

__all__ = [
    "RuleEngine",
    "DetectionRule",
    "RuleMatchResult",
    "EventFeatureExtractor",
    "AnomalyDetector",
    "IncidentStateMachine",
    "InvalidStateTransitionError",
    "IncidentCorrelator",
    "DetectionEngine",
]
