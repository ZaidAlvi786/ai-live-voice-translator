import time
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class LatencyTracker:
    """
    Millisecond-precision timer for the AI Pipeline.
    Tracks checkpoints: audio_in -> stt -> qbd -> llm -> tts.
    """
    def __init__(self, meeting_id: str):
        self.meeting_id = meeting_id
        self.checkpoints: Dict[str, float] = {}
        self.turn_id = 0
        self.history: List[Dict] = []

    def start_turn(self):
        """Resets the timer for a new conversational turn."""
        self.turn_id += 1
        self.checkpoints = {
            "start": time.perf_counter()
        }
        # Reset specific metrics
        for key in ["stt_complete", "qbd_complete", "llm_start", "tts_first_byte"]:
            self.checkpoints[key] = 0.0

    def mark(self, checkpoint: str):
        """Records a timestamp for a specific stage."""
        if "start" not in self.checkpoints:
             self.start_turn()
        
        self.checkpoints[checkpoint] = time.perf_counter()
        
        # Calculate delta immediately for logging
        start = self.checkpoints["start"]
        current = self.checkpoints[checkpoint]
        delta_ms = (current - start) * 1000
        # logger.debug(f"Latency [{self.meeting_id}]: {checkpoint} @ +{delta_ms:.2f}ms")

    def get_report(self) -> Dict[str, float]:
        """Returns validated latencies in ms."""
        start = self.checkpoints.get("start", 0)
        if not start:
            return {}

        report = {}
        for key, val in self.checkpoints.items():
            if key == "start": continue
            if val > 0:
                report[f"latency_{key}_ms"] = (val - start) * 1000
        
        # Calculate specific gaps if data exists
        if "tts_first_byte" in self.checkpoints and self.checkpoints["tts_first_byte"] > 0:
             report["total_e2e_latency_ms"] = (self.checkpoints["tts_first_byte"] - start) * 1000
             
        return report
