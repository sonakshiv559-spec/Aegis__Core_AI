"""
AegisCore AI – Statistical Anomaly Baseline Detector
Computes statistical rarity / deviation of telemetry events relative to historical baseline.
Utilizes scikit-learn IsolationForest if available, with a resilient statistical baseline fallback.
"""

from __future__ import annotations

import math
from typing import List, Optional
import structlog

from schemas.ocsf import OCSFEvent
from services.detection.features import EventFeatureExtractor

logger = structlog.get_logger()


class AnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.model = None
        self._sklearn_available = False

        try:
            from sklearn.ensemble import IsolationForest  # type: ignore
            self.model = IsolationForest(
                n_estimators=100,
                contamination=self.contamination,
                random_state=42,
            )
            self._sklearn_available = True
            logger.info("aegiscore.anomaly.initialized", engine="IsolationForest")
        except ImportError:
            logger.info("aegiscore.anomaly.fallback", engine="WeightedDistanceBaseline")

        # Baseline centroids / weights for fallback model
        # Normal profile: internal IP (0), success outcome (0), normal browser (0), normal user (0), normal port (0)
        self.feature_weights = [0.25, 0.15, 0.20, 0.15, 0.15, 0.35, 0.30, 0.05]

    def fit_baseline(self, baseline_events: List[OCSFEvent]) -> None:
        """Trains the model on normal enterprise baseline telemetry."""
        if not baseline_events:
            return

        matrix = [EventFeatureExtractor.extract_features(e) for e in baseline_events]
        if self._sklearn_available and self.model:
            try:
                self.model.fit(matrix)
                logger.info("aegiscore.anomaly.fitted", sample_count=len(matrix))
            except Exception as e:
                logger.error("aegiscore.anomaly.fit_error", error=str(e))

    def predict_anomaly_score(self, event: OCSFEvent) -> float:
        """
        Computes anomaly score between 0.0 (completely expected) and 1.0 (highly anomalous).
        Non-collapsed dimension: strictly represents statistical rarity.
        """
        features = EventFeatureExtractor.extract_features(event)

        if self._sklearn_available and self.model and hasattr(self.model, "estimators_"):
            try:
                # decision_function gives negative values for anomalies, positive for normal
                score = self.model.decision_function([features])[0]
                # Normalize typical range [-0.5, 0.5] to [1.0, 0.0]
                normalized = 1.0 / (1.0 + math.exp(score * 4.0))
                return float(max(0.0, min(1.0, normalized)))
            except Exception:
                pass

        # Resilient statistical baseline fallback
        weighted_sum = sum(f * w for f, w in zip(features, self.feature_weights))
        max_weight = sum(self.feature_weights)
        raw_score = weighted_sum / max_weight

        # Softmax curve adjustment
        score = 1.0 / (1.0 + math.exp(-6.0 * (raw_score - 0.35)))
        return float(round(max(0.05, min(0.98, score)), 2))
