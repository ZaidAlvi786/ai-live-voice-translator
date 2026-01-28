import logging
import asyncio
import os
import random
from playwright.async_api import Page
from .browser import browser_service

logger = logging.getLogger(__name__)

class GoogleMeetAdapter:
    """
    Automates Google Meet interactions: Joining, Muting, and Audio Injection.
    Implements Meeting Join Reliability Engine (MJRE) standards.
    """
    def __init__(self, meeting_id: str, meeting_url: str, agent_name: str, agent_id: str):
        self.meeting_id = meeting_id
        self.meeting_url = meeting_url
        self.agent_name = agent_name
        self.agent_id = agent_id
        self.page: Page = None

    async def connect(self):
        """
        Full connection flow with MJRE standards:
        1. Context Launch (Persistent Profile)
        2. Audio Stack Pre-flight
        3. Authentication Check (Strict)
        4. Navigation & Join
        """
        # Ensure URL has protocol
        if not self.meeting_url.startswith("http"):
            self.meeting_url = f"https://{self.meeting_url}"
            
        logger.info(f"Connecting to Meet: {self.meeting_url} (Agent: {self.agent_id})")
        
        # 1. Launch & Context (Persistent)
        context = await browser_service.launch_for_agent(self.agent_id)
        
        # --- VIRTUAL MIC SHIM ---
        shim_script = """
        (function() {
            // Create AudioContext only once user interacts (or we auto-resume)
            // But we need it for the stream immediately.
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            const gain = audioCtx.createGain(); 
            gain.connect(dest); // Connect gain to destination
            
            // --- PINK NOISE INJECTOR (HEMR) ---
            // Prevent silent-bot detection by injecting -42dB pink noise.
            const bufferSize = 4096;
            const pinkNoise = audioCtx.createScriptProcessor(bufferSize, 1, 1);
            
            let lastOut = 0; // Moved UP to ensure scope safety
            
            pinkNoise.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 0.008; // ~-42dB
                }
            };
            
            pinkNoise.connect(dest); // Connect noise to Virtual Mic
            console.log("HEMR: Pink Noise Injector Active (-42dB).");
            // -----------------------------------
            
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
            
            const shimmedGetUserMedia = async (constraints) => {
                 console.log("Intercepted getUserMedia:", constraints);
                 if (constraints.audio) {
                     // Return our mixed stream
                     if (!constraints.video) {
                         return dest.stream;
                     }
                     // If both, we need to get real video + our fake audio
                     try {
                         const realStream = await originalGetUserMedia({ ...constraints, audio: false });
                         const mixed = new MediaStream([
                             ...realStream.getVideoTracks(),
                             ...dest.stream.getAudioTracks()
                         ]);
                         return mixed;
                     } catch (e) {
                         console.error("Video GUM failed, returning audio only", e);
                         return dest.stream;
                     }
                 }
                 return originalGetUserMedia(constraints);
            };

            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: shimmedGetUserMedia,
                writable: true
            });
            shimmedGetUserMedia.toString = () => 'function getUserMedia() { [native code] }';

            console.log("Virtual Microphone Installed (Stealth Mode).");
        })();
        """
        await context.add_init_script(shim_script)
        
        self.page = await context.new_page()

        # 1.5. Establish Secure Context & Check Login
        # We navigate to Google Accounts first. This establishes a Secure Context (HTTPS)
        # required for navigator.mediaDevices, AND lets us check login status.
        try:
             await self.page.goto("https://accounts.google.com/ServiceLogin", wait_until="domcontentloaded")
        except Exception as e:
             logger.warning(f"Initial navigation failed: {e}")

        # 2. Audio Stack Pre-flight (Now in Secure Context)
        if not await self._verify_audio_stack():
            logger.error("Audio Stack verification failed. Aborting join.")
            return

        # 3. Authentication Check (Strict)
        # We MUST be logged in or have a persistent session.
        if not await self._ensure_login_state_on_page():
            logger.warning("Could not establish authenticated session. Aborting join to prevent anonymous block.")
            return

        # 4. Navigate to Meeting
        try:
           # Use domcontentloaded as Meet is a heavy SPA
           await self.page.goto(self.meeting_url, wait_until="domcontentloaded", timeout=45000)
           logger.info(f"Navigated to {self.meeting_url}")
           
           # Check for known "Blocked" states immediately
           try:
                content = await self.page.content()
                if "You can't join this video call" in content or "Return to home screen" in content:
                    logger.error("CRITICAL: Google Meet blocked this session. Capturing screenshot...")
                    await self.page.screenshot(path="debug_block_critical.png")
                    return # Stop here
           except: pass

        except Exception as e:
           logger.warning(f"Navigation timeout/error (continuing anyway): {e}")

        # 5. Handle "Got it"
        try:
             await self.page.click("span:text('Got it'), span:text('Dismiss')", timeout=2000)
        except: 
             pass

        # 6. Input Name (Only if asked - usually means anonymous)
        try:
             # If we are asked for a name, it means we are NOT logged in properly or joining as guest.
             # Strict MJRE policy says we should avoid this, but if we proceeded, we try.
             name_input = await self.page.wait_for_selector(
                 "input[placeholder='Your name']:visible, input[aria-label='Your name']:visible, input[type='text']:visible", 
                 timeout=5000,
                 state="visible"
             )
             if name_input:
                 logger.warning("Asked for name - Session is behaving anonymously.")
                 await self._human_type(name_input, self.agent_name)
                 await self.page.keyboard.press("Enter")
                 await asyncio.sleep(2) 
        except:
             # Likely logged in, no name prompt needed
             pass

        # 7. Join with PRE-JOIN HUMANIZATION (HEMR)
        try:
             # Wait for join button
             join_btn = await self.page.wait_for_selector(
                 "button:has-text('Ask to join'):visible, button:has-text('Join now'):visible, span:has-text('Ask to join'):visible, span:has-text('Join now'):visible", 
                 timeout=30000,
                 state="visible"
             )
             if join_btn:
                 logger.info("Join Button Found. Starting Level 3 Friction Engine...")
                 
                 # 0. bring window to front
                 try:
                     await self.page.bring_to_front()
                 except: pass

                 # A. Bezier Mouse Movement (Simulate looking around)
                 await self._human_mouse_move(self.page)
                 
                 # B. Device Toggle Simulation (Toggle Mic/Cam to show activity)
                 try: 
                     mic_toggle = await self.page.wait_for_selector("div[role='button'][aria-label*='micro']:visible", timeout=2000)
                     if mic_toggle:
                         # Move to it
                         await mic_toggle.hover()
                         await self._random_delay(300, 700)
                         await mic_toggle.click() # Off
                         logger.info("Friction: Mic Off")
                         await self._random_delay(800, 1500)
                         await mic_toggle.click() # On
                         logger.info("Friction: Mic On")
                 except: pass

                 # D. Hesitation (Hover over Join)
                 logger.info("Friction: Hovering Join Button...")
                 await join_btn.hover()
                 await self._random_delay(2000, 3000) 
                 
                 logger.info("Attempting to Click Join...")
                 # Try execution click (more reliable for SPAs)
                 await join_btn.click()
                 
                 # Double check: Did the status change?
                 await asyncio.sleep(2)
                 try:
                     # If the button is still there and enabled, click it via JS
                     still_there = await join_btn.is_visible()
                     if still_there:
                         logger.warning("Standard click might have failed. Forcing JS Click...")
                         await join_btn.evaluate("el => el.click()")
                 except: pass
                 
                 logger.info("Clicked Join (Humanized Level 3).")
                 
                 # Wait for "Asking to join" text to confirm
                 try:
                     await self.page.wait_for_selector("text='Asking to join'", timeout=5000)
                     logger.info("Join Request Sent Successfully.")
                 except:
                     logger.warning("Did not see 'Asking to join' confirmation. Capturing debug shot...")
                     await self.page.screenshot(path="debug_ask_to_join_stuck.png")

        except Exception as e:
             logger.error(f"Join button error: {e}")
             await self.page.screenshot(path="debug_join_fail.png")
        except Exception as e:
             logger.error(f"Join button not found or interaction failed: {e}")
             await self.page.screenshot(path="debug_join_fail.png")

        # 8. Wait for Admission
        try:
             await self.page.wait_for_selector("div[data-is-muted]", timeout=60000) 
             logger.info("Successfully inside the meeting.")
             
             # Start Entropy Engine
             await self._start_entropy_daemon()

        except:
             logger.warning("Timed out waiting for admission.")

        # 9. Inject Audio Bridge (Capture & Playback)
        await self._inject_audio_bridge()

    async def _verify_audio_stack(self) -> bool:
        """
        Checks if AudioContext and MediaDevices are working.
        """
        try:
            return await self.page.evaluate("""() => {
                const results = {
                    hasAudioContext: !!(window.AudioContext || window.webkitAudioContext),
                    hasMediaDevices: !!navigator.mediaDevices,
                    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
                };
                console.log("Audio Stack Check:", results);
                
                if (!results.hasAudioContext) return false;
                if (!results.hasMediaDevices || !results.hasGetUserMedia) return false;
                return true;
            }""")
        except Exception as e:
            logger.error(f"Audio Stack Check Exception: {e}")
            return False

    async def _ensure_login_state_on_page(self) -> bool:
        """
        Checks Login -> Performs Login if needed.
        Assumes page is already at Google ServiceLogin or a Google property.
        Returns True if logged in (or successfully logged in), False otherwise.
        """
        email = os.environ.get("GOOGLE_EMAIL")
        password = os.environ.get("GOOGLE_PASSWORD")
        
        # Validates session by checking "My Account" availability or similar
        try:
            # We are already on strict secure endpoint.
            # Check URL 
            await asyncio.sleep(1) # Wait for redirects if any
            
            if "myaccount.google.com" in self.page.url:
                logger.info("Session Valid (Persistent).")
                return True
            
            if not email or not password:
                logger.error("Not logged in and no credentials provided in ENV.")
                return False

            logger.info("Session Invalid. Initiating Login Flow...")
            
            # Email
            # Use specific selectors for email to avoid capturing hidden traps
            email_input = await self.page.wait_for_selector("input[type='email']:visible", timeout=5000)
            if email_input:
                await self._human_type(email_input, email)
                await asyncio.sleep(0.5)
                
                # Click "Next" explicitly. Google Login usually has a "Next" button.
                # Do NOT rely on Enter key alone.
                next_btn = await self.page.wait_for_selector("button:has-text('Next'):visible, div[role='button']:has-text('Next'):visible", timeout=3000)
                if next_btn:
                    await next_btn.click()
                else:
                    await self.page.keyboard.press("Enter")
                
                # Password
                # Wait longer for transition (network + animation)
                try:
                    password_input = await self.page.wait_for_selector(
                        "input[type='password'][name='password']:visible, input[type='password']:visible", 
                        timeout=15000, 
                        state="visible"
                    )
                except Exception as wait_err:
                     logger.error(f"Password field not found or not visible: {wait_err}")
                     # Debug screenshot
                     await self.page.screenshot(path="debug_login_fail.png")
                     return False

                if password_input:
                    # Deception Check
                    is_hidden = await password_input.evaluate("(el) => el.getAttribute('aria-hidden') === 'true' || el.getAttribute('tabindex') === '-1' || window.getComputedStyle(el).opacity === '0'")
                    if is_hidden:
                        logger.error("Deceptive Password Field Detected! Aborting login.")
                        return False
                        
                    await asyncio.sleep(1)
                    await self._human_type(password_input, password)
                    await asyncio.sleep(0.5)
                    await self.page.keyboard.press("Enter") # Usually works for password, or find Next again
                    
                    # Wait for redirect
                    try:
                        # Wait for ANY indicator of a logged-in state:
                        # 1. My Account (Ideal)
                        # 2. Google Account header
                        # 3. Absence of password field + URL change
                        await self.page.wait_for_url("**/myaccount.google.com/**", timeout=20000)
                        logger.info("Login Successful (Landed on MyAccount).")
                        return True
                    except:
                        # --- INTERSTITIAL HANDLING START ---
                        logger.info("Handling potential Interstitials (Not Now, Security Checkup)...")
                        
                        interstitial_handled = False

                        # 1. "Not Now" (Recovery Info)
                        try:
                            not_now_btn = await self.page.wait_for_selector("text='Not now', span:text('Not now'), div[role='button']:has-text('Not now')", timeout=2000)
                            if not_now_btn:
                                logger.info("Dismissing 'Not Now' prompt...")
                                await not_now_btn.click()
                                await asyncio.sleep(2)
                                interstitial_handled = True
                        except: pass
                        
                        # 2. "Done" / "Confirm" (Security Checkup)
                        if not interstitial_handled:
                            try:
                                 done_btn = await self.page.wait_for_selector("text='Done', span:text('Done'), div[role='button']:has-text('Confirm')", timeout=2000)
                                 if done_btn:
                                     logger.info("Dismissing Security Checkup...")
                                     await done_btn.click()
                                     await asyncio.sleep(2)
                                     interstitial_handled = True
                            except: pass
                        
                        # 3. "I agree" (Terms)
                        if not interstitial_handled:
                            try:
                                 agree_btn = await self.page.wait_for_selector("text='I agree', span:text('I agree')", timeout=2000)
                                 if agree_btn:
                                     logger.info("Accepting Terms...")
                                     await agree_btn.click()
                                     await asyncio.sleep(2)
                                     interstitial_handled = True
                            except: pass
                        
                        # --- INTERSTITIAL HANDLING END ---
                        
                        # Re-verify Login State
                        if "myaccount.google.com" in self.page.url:
                             logger.info("Login Successful (After Interstitial).")
                             return True

                        logger.warning(f"Login flow finished. Current URL: {self.page.url}")
                        
                        # Final Check: Are we still on signin?
                        if "signin/v2" in self.page.url or "accounts.google.com/signin" in self.page.url:
                             logger.error("Still on Sign-in page. Login FAILED.")
                             await self.page.screenshot(path="debug_login_stuck.png")
                             return False
                        
                        logger.info("Assuming Login Success (Navigated away from Sign-in).")
                        return True 
            return False
            
        except Exception as e:
            logger.error(f"Login Check Failed: {e}")
            await self.page.screenshot(path="debug_login_exception.png")
            return False

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
            ws.onmessage = async (event) => {{
                if (event.data instanceof ArrayBuffer) {{
                    if (window.playAudioChunk) {{
                        await window.playAudioChunk(event.data);
                    }}
                }}
            }};

            // 2. OUTGOING AUDIO (Ears)
            function captureAudio() {{
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (audioCtx.state === 'suspended') audioCtx.resume();
                
                const dest = audioCtx.createMediaStreamDestination();
                
                const observer = new MutationObserver((mutations) => {{
                    document.querySelectorAll('audio').forEach(audio => {{
                        if (!audio._hooked) {{
                            try {{
                                const source = audioCtx.createMediaElementSource(audio);
                                source.connect(dest);
                                source.connect(audioCtx.destination); 
                                audio._hooked = true;
                            }} catch(e) {{}}
                        }}
                    }});
                }});
                
                observer.observe(document.body, {{ childList: true, subtree: true }});

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

    async def _human_type(self, element, text: str):
        """Types with random delays to mimic human behavior."""
        for char in text:
            await element.type(char, delay=random.randint(50, 150))

    async def _random_delay(self, min_ms=500, max_ms=2000):
        await asyncio.sleep(random.randint(min_ms, max_ms) / 1000)

    async def _human_mouse_move(self, page):
        """
        Simulates human-like mouse movement (Bezier-like curves).
        """
        try:
            # Simple simulation: Move to a few random points with steps
            width = 1920
            height = 1080
            for _ in range(random.randint(3, 5)):
                x = random.randint(100, width - 100)
                y = random.randint(100, height - 100)
                await page.mouse.move(x, y, steps=random.randint(10, 25))
                await asyncio.sleep(random.uniform(0.1, 0.3))
        except Exception as e:
            logger.warning(f"Mouse validation failed: {e}")

    async def _start_entropy_daemon(self):
        """
        Background task to inject periodic entropy (focus, mouse, resize)
        to defeat static-bot detection during the meeting.
        """
        logger.info("Starting HEMR Entropy Daemon...")
        async def entropy_loop():
            width = 1920
            height = 1080
            while self.page and not self.page.is_closed():
                try:
                    # 1. Random Viewport Jitter (+/- 2px)
                    if random.random() < 0.1: # Less frequent
                         w = width + random.randint(-2, 2)
                         h = height + random.randint(-2, 2)
                         await self.page.set_viewport_size({"width": w, "height": h})
                    
                    # 2. Focus/Blur Simulation (Rare "Alt-Tab")
                    if random.random() < 0.05:
                         await self.page.evaluate("window.dispatchEvent(new Event('blur'))")
                         await asyncio.sleep(random.uniform(0.5, 2.0))
                         await self.page.bring_to_front()
                         await self.page.evaluate("window.dispatchEvent(new Event('focus'))")

                    # 3. Micro-Scroll (Frequent "reading" behavior)
                    if random.random() < 0.4:
                         await self.page.mouse.wheel(0, random.randint(5, 50))
                         await asyncio.sleep(0.5)
                         await self.page.mouse.wheel(0, random.randint(-5, -50)) # Scroll back

                    # 4. Mouse Drift (Idleness is suspicious)
                    if random.random() < 0.7:
                        x = random.randint(100, width - 100)
                        y = random.randint(100, height - 100)
                        await self.page.mouse.move(x, y, steps=random.randint(10, 50))
                    
                    await asyncio.sleep(random.randint(5, 15))
                except Exception as e:
                    logger.warning(f"Entropy Error: {e}")
                    break
        
        # Fire and forget
        asyncio.create_task(entropy_loop())

    async def leave(self):
        if self.page:
            await self.page.close()
