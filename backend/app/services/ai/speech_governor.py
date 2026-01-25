import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class SpeechGovernor:
    """
    Controls the Agent's speaking state, pacing, and interruption handling.
    """
    def __init__(self):
        self.is_speaking = False
        self.interrupt_event = asyncio.Event()
        # VAD thresholds (Energy based heuristic for now, assuming pre-processed input)
        self.energy_threshold = 0.05 # placeholder
        self.last_transcript_time = 0

    def should_interrupt(self, transcript_chunk: str) -> bool:
        """
        Determines if the user's speech is substantial enough to trigger an interruption.
        Ignores short noise (< 4 chars) to prevent false positives.
        """
        # Basic heuristic: If user speaks > 4 chars while agent is speaking, interrupt.
        clean_text = transcript_chunk.strip()
        if len(clean_text) > 4:
            logger.info(f"Interruption detected: '{clean_text}'")
            return True
        return False

    async def interrupt(self):
        """
        Triggers the interruption state.
        """
        if not self.is_speaking:
            return
            
        logger.warning("SpeechGovernor: TRIGGERING INTERRUPTION")
        self.interrupt_event.set()
        self.is_speaking = False
        # We allow the Orchestrator to handle the queue clearing logic based on this event.

    def clear_interruption(self):
        """Resets interruption state for the next turn."""
        self.interrupt_event.clear()

    def calculate_pause(self, mode: str) -> float:
        """
        Returns pause duration in seconds based on mode.
        """
        if mode == "interview":
            return 0.6 # Longer thoughtful pause
        elif mode == "standup":
            return 0.2 # Snappy status update
        return 0.4
