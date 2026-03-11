import numpy as np
import fractions
import asyncio
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from av import AudioFrame, AudioResampler
import av
import io

class AIOrchestratorAudioTrack(MediaStreamTrack):
    """
    A MediaStreamTrack that pulls generated audio from the AI Orchestrator.
    Handles decoding ElevenLabs MP3 chunks into WebRTC AudioFrames.
    """
    kind = "audio"

    def __init__(self, orchestrator):
        super().__init__()
        self.orchestrator = orchestrator
        self.resampler = AudioResampler(format='s16', layout='mono', rate=48000)
        self.container = av.open(io.BytesIO(), mode='r', format='mp3')
        self.fifo = av.AudioFifo()
        self.pts = 0

    async def recv(self):
        """
        Pulls raw PCM chunks (44.1kHz) from the orchestrator queue, resamples them,
        and returns timed AudioFrames.
        """
        # 1. If FIFO is empty, pull more data from orchestrator
        while self.fifo.samples_cb < 960: # 20ms at 48kHz
            try:
                # Get PCM chunk from AI (16-bit Mono, 44.1kHz)
                chunk = await self.orchestrator.audio_output_queue.get()
                
                # Wrap PCM bytes into an AudioFrame for the resampler
                # Linear PCM 16-bit Mono = 2 bytes per sample
                samples = np.frombuffer(chunk, dtype=np.int16)
                frame = AudioFrame.from_ndarray(samples.reshape(1, -1), format='s16', layout='mono')
                frame.sample_rate = 44100
                
                resampled_frames = self.resampler.resample(frame)
                for f in resampled_frames:
                    self.fifo.write(f)
            except Exception as e:
                print(f"WebRTC Outbound Bridge Error: {e}")
                break

        # 2. Return 20ms of audio
        frame = self.fifo.read(960)
        if frame:
            frame.pts = self.pts
            frame.time_base = fractions.Fraction(1, 48000)
            self.pts += 960
            return frame
        
        # 3. Last fallback: Silence
        silence = np.zeros(960, dtype=np.int16)
        frame = AudioFrame.from_ndarray(silence.reshape(1, -1), format='s16', layout='mono')
        frame.sample_rate = 48000
        return frame

async def create_webrtc_answer(sdp_offer: str, orchestrator):
    """
    Accepts an SDP offer and returns an SDP answer.
    Bridges the provided orchestrator to the tracks.
    """
    pc = RTCPeerConnection()
    
    @pc.on("track")
    def on_track(track):
        print(f"Track received: {track.kind}")
        if track.kind == "audio":
            async def pipe_to_ai():
                # Resampler to 16kHz Mono (Linear16) for Deepgram
                resampler = AudioResampler(format='s16', layout='mono', rate=16000)
                while True:
                    try:
                        frame = await track.recv()
                        resampled = resampler.resample(frame)
                        for f in resampled:
                            # Convert AudioFrame to raw bytes
                            pcm_bytes = f.to_ndarray().tobytes()
                            await orchestrator.ingest_audio(pcm_bytes)
                    except Exception as e:
                        print(f"WebRTC Inbound Pipe Error: {e}")
                        break
            asyncio.create_task(pipe_to_ai())

    # Add the AI track to send back to the meeting
    pc.addTrack(AIOrchestratorAudioTrack(orchestrator))
    
    # Set the remote description (The Offer)
    offer = RTCSessionDescription(sdp=sdp_offer, type="offer")
    await pc.setRemoteDescription(offer)
    
    # Create the answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    return pc.localDescription.sdp, pc
