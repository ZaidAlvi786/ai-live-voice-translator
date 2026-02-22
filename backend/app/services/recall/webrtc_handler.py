import numpy as np
import fractions
import asyncio
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from av import AudioFrame

class SineWaveAudioTrack(MediaStreamTrack):
    """
    A MediaStreamTrack that generates a 440Hz sine wave.
    """
    kind = "audio"

    def __init__(self, frequency=440, sample_rate=48000):
        super().__init__()
        self.frequency = frequency
        self.sample_rate = sample_rate
        self.time = 0
        self.samples_per_frame = int(sample_rate / 50) # 20ms frames

    async def recv(self):
        """
        Generate and return an AudioFrame.
        """
        # Generate sine wave samples
        # samples per frame: sample_rate * 0.02 (for 20ms)
        t = np.arange(self.time, self.time + self.samples_per_frame) / self.sample_rate
        samples = (np.sin(2 * np.pi * self.frequency * t) * 32767).astype(np.int16)
        self.time += self.samples_per_frame

        # Create AudioFrame (Signed 16-bit, Mono)
        # Reshape to (channels, samples)
        frame = AudioFrame.from_ndarray(samples.reshape(1, -1), format='s16', layout='mono')
        frame.sample_rate = self.sample_rate
        frame.pts = self.time - self.samples_per_frame
        frame.time_base = fractions.Fraction(1, self.sample_rate)
        return frame

async def create_webrtc_answer(sdp_offer: str):
    """
    Accepts an SDP offer and returns an SDP answer.
    """
    pc = RTCPeerConnection()
    
    # Store PC globally or in a manager for cleanup later
    # For now, we'll just handle the track extraction
    
    @pc.on("track")
    def on_track(track):
        print(f"Track received: {track.kind}")
        if track.kind == "audio":
            # Task 2: Extract incoming audio track
            # In a real app, we would process this track (e.g., save to file, send to STT)
            async def log_track():
                while True:
                    try:
                        frame = await track.recv()
                        # print(f"Received audio frame: {frame.pts}")
                    except Exception as e:
                        print(f"Track reception ended: {e}")
                        break
            asyncio.create_task(log_track())

    # Task 3: Add the 'Beep' track to send back to the meeting
    pc.addTrack(SineWaveAudioTrack())
    
    # Set the remote description (The Offer)
    offer = RTCSessionDescription(sdp=sdp_offer, type="offer")
    await pc.setRemoteDescription(offer)
    
    # Create the answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    return pc.localDescription.sdp, pc
