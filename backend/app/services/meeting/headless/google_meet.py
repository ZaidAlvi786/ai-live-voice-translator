import logging
import asyncio
from playwright.async_api import Page
from .browser import browser_service

logger = logging.getLogger(__name__)

class GoogleMeetAdapter:
    """
    Automates Google Meet interactions: Joining, Muting, and Audio Injection.
    """
    def __init__(self, meeting_id: str, meeting_url: str, agent_name: str):
        self.meeting_id = meeting_id
        self.meeting_url = meeting_url
        self.agent_name = agent_name
        self.page: Page = None

    async def connect(self):
        """
        Full connection flow: Launch -> Inject Virtual Mic -> Navigate -> Join -> Connect Audio.
        """
        # Ensure URL has protocol
        if not self.meeting_url.startswith("http"):
            self.meeting_url = f"https://{self.meeting_url}"
            
        logger.info(f"Connecting to Meet: {self.meeting_url}")
        
        # 1. Get Context with Virtual Mic Shim
        # We need to inject the shim BEFORE navigation so getUserMedia is intercepted.
        context = await browser_service.new_context()
        
        # --- VIRTUAL MIC SHIM ---
        # This script replaces navigator.mediaDevices.getUserMedia with a version that
        # returns a stream from a WebAudio destination we control.
        # We also expose a global 'window.playAudioChunk(arrayBuffer)' for the bridge to call.
        shim_script = """
        (function() {
            // Create AudioContext only once user interacts (or we auto-resume)
            // But we need it for the stream immediately.
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            const gain = audioCtx.createGain(); 
            gain.connect(dest); // Connect gain to destination
            
            // Expose the play function
            window.playAudioChunk = async (arrayBuffer) => {
                if(audioCtx.state === 'suspended') await audioCtx.resume();
                try {
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    const source = audioCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(gain);
                    source.start(0);
                } catch(e) {
                    console.error("Audio Decode Failed", e);
                }
            };
            
            // Override getUserMedia
            const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            
            navigator.mediaDevices.getUserMedia = async (constraints) => {
                 console.log("Intercepted getUserMedia:", constraints);
                 if (constraints.audio) {
                     // Return our mixed stream
                     // We merge it with original video if requested?
                     // Meet usually asks for audio and video separately or together.
                     // If just audio:
                     if (!constraints.video) {
                         return dest.stream;
                     }
                     // If both, we need to get real video + our fake audio
                     const realStream = await originalGetUserMedia({ ...constraints, audio: false });
                     const mixed = new MediaStream([
                         ...realStream.getVideoTracks(),
                         ...dest.stream.getAudioTracks()
                     ]);
                     return mixed;
                 }
                 return originalGetUserMedia(constraints);
            };
            console.log("Virtual Microphone Installed.");
        })();
        """
        await context.add_init_script(shim_script)
        
        self.page = await context.new_page()

        # 2. Navigate
        try:
           await self.page.goto(self.meeting_url, timeout=60000)
        except Exception as e:
           logger.error(f"Navigation failed: {e}")
           return

        # 3. Handle "Got it"
        try:
             await self.page.click("span:text('Got it')", timeout=2000)
        except: 
             pass

        # 4. Input Name
        try:
             # Try multiple selectors for name input
             name_input = await self.page.wait_for_selector(
                 "input[placeholder='Your name'], input[aria-label='Your name'], input[type='text']", 
                 timeout=5000
             )
             if name_input:
                 await name_input.fill(self.agent_name)
                 await self.page.keyboard.press("Enter")
                 logger.info(f"Entered name: {self.agent_name}")
                 await asyncio.sleep(1) # Wait for UI to update
        except:
             logger.info("No name input found (might be logged in).")

        # 5. Join
        try:
             # Wait longer for the button to appear/enable
             join_btn = await self.page.wait_for_selector(
                 "button:has-text('Ask to join'), button:has-text('Join now'), span:has-text('Ask to join'), span:has-text('Join now')", 
                 timeout=30000
             )
             if join_btn:
                 await join_btn.click()
                 logger.info("Clicked Join.")
        except Exception as e:
             logger.error(f"Join button not found: {e}")
             # Try screenshot for debugging (saved to local disk)
             await self.page.screenshot(path="debug_join_fail.png")
        except Exception as e:
             logger.error(f"Join button not found: {e}")

        # 6. Wait for Admission
        try:
             await self.page.wait_for_selector("div[data-is-muted]", timeout=60000) 
             logger.info("Successfully inside the meeting.")
        except:
             logger.warning("Timed out waiting for admission.")

        # 7. Inject Audio Bridge (Capture & Playback)
        await self._inject_audio_bridge()

    async def _inject_audio_bridge(self):
        """
        Connects WS to Backend. Captures Meeting Audio -> Backend.
        Receives Backend Audio -> Plays to Virtual Mic.
        """
        logger.info("Injecting Audio Bridge...")
        ws_url = f"ws://localhost:8000/api/v1/ws/{self.meeting_id}"
        
        bridge_script = f"""
        (function() {{
            console.log("Initializing Neuralis Audio Bridge...");
            const ws = new WebSocket("{ws_url}");
            ws.binaryType = 'arraybuffer';
            
            ws.onopen = () => {{
                console.log("Bridge WS Connected");
                captureAudio();
            }};
            ws.onerror = (e) => console.error("Bridge WS Error", e);
            
            // 1. INCOMING AUDIO (Mouth)
            // Receive TTS chunks and play to Virtual Mic
            ws.onmessage = async (event) => {{
                if (event.data instanceof ArrayBuffer) {{
                    if (window.playAudioChunk) {{
                        await window.playAudioChunk(event.data);
                    }}
                }}
            }};

            // 2. OUTGOING AUDIO (Ears)
            // Capture Meeting Audio (Speakers) to stream to Backend
            function captureAudio() {{
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (audioCtx.state === 'suspended') audioCtx.resume();
                
                const dest = audioCtx.createMediaStreamDestination();
                
                // Monitor DOM for audio elements (Participants)
                const observer = new MutationObserver((mutations) => {{
                    document.querySelectorAll('audio').forEach(audio => {{
                        if (!audio._hooked) {{
                            try {{
                                // Need to allow cross-origin? Meet usually blobs.
                                const source = audioCtx.createMediaElementSource(audio);
                                source.connect(dest);
                                source.connect(audioCtx.destination); // Play locally too
                                audio._hooked = true;
                            }} catch(e) {{}}
                        }}
                    }});
                }});
                
                observer.observe(document.body, {{ childList: true, subtree: true }});

                // Stream to WS
                const recorder = new MediaRecorder(dest.stream, {{ mimeType: 'audio/webm' }});
                recorder.ondataavailable = (e) => {{
                    if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {{
                        ws.send(e.data);
                    }}
                }};
                recorder.start(100);
            }}
            
            ws.onopen = () => captureAudio();
        }})();
        """
        try:
            await self.page.evaluate(bridge_script)
            logger.info("Audio Bridge Connected.")
        except Exception as e:
            logger.error(f"Bridge Injection failed: {e}")

    async def leave(self):
        if self.page:
            await self.page.close()
