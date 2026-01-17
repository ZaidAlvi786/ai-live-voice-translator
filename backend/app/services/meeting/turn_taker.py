import asyncio
from enum import Enum
import time

class TurnState(Enum):
    IDLE = "IDLE"           # Listening, low energy
    PLANNING = "PLANNING"   # Thinking about response (triggered by keyword/address)
    PRE_SPEECH = "PRE_SPEECH" # Breath / Ready to talk
    SPEAKING = "SPEAKING"   # Active TTS output
    INTERRUPTED = "INTERRUPTED" # Stopped mid-stream
    YIELDING = "YIELDING"   # "Go ahead"

class TurnTaker:
    def __init__(self):
        self.state = TurnState.IDLE
        self.last_speech_time = 0
        self.energy_threshold = -30 # dB
        self.interrupt_window = 0.3 # seconds of loud audio to trigger interrupt

    def update_audio_energy(self, energy_db: float):
        """
        Called with every audio chunk energy level.
        Returns: Action to take (e.g., 'STOP_TTS', 'NONE')
        """
        current_time = time.time()
        
        # INTERRUPT LOGIC
        if self.state == TurnState.SPEAKING:
            if energy_db > self.energy_threshold:
                # Potential interrupt
                # In real impl, we'd use a rolling window to debounce short noises vs speech
                print("High energy detected during speech - INTERRUPT CHECK")
                self.state = TurnState.INTERRUPTED
                return "STOP_TTS"

        return "NONE"

    async def request_turn(self):
        """Call when AI wants to speak."""
        if self.state == TurnState.IDLE:
            self.state = TurnState.PLANNING
            # formatting wait...
            await asyncio.sleep(0.1) 
            self.state = TurnState.PRE_SPEECH
            return True
        return False

    def start_speaking(self):
        self.state = TurnState.SPEAKING

    def finish_speaking(self):
        self.state = TurnState.IDLE
        self.last_speech_time = time.time()
