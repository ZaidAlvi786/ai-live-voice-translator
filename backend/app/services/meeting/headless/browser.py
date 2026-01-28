import logging
import asyncio
import os
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

logger = logging.getLogger(__name__)

class HeadlessBrowserService:
    """
    Manages the lifecycle of a Headless Chromium browser for meeting automation.
    Supports per-agent persistent profiles.
    """
    def __init__(self):
        self.playwright = None
        self._lock = asyncio.Lock()
        # Map agent_id -> BrowserContext
        self.active_contexts = {}

    async def launch_for_agent(self, agent_id: str) -> BrowserContext:
        """
        Launches a PERSISTENT browser context for a specific agent.
        This saves cookies/login state to ./chrome_data/agent_<id>, making the bot appear as a 'returning user'.
        """
        async with self._lock:
            if agent_id in self.active_contexts:
                return self.active_contexts[agent_id]

            if not self.playwright:
                self.playwright = await async_playwright().start()

            user_data_dir = os.path.join(os.getcwd(), "chrome_data", f"agent_{agent_id}")
            os.makedirs(user_data_dir, exist_ok=True)
            
            logger.info(f"Launching Persistent Browser for Agent {agent_id} (Profile: {user_data_dir})...")
            
            # Anti-Detection Args
            args = [
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-features=IsolateOrigins,site-per-process",
                "--window-size=1920,1080",
                "--remote-debugging-port=9222",
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream", # Only if we don't have real devices, but we want to simulate
                "--autoplay-policy=no-user-gesture-required",
            ]

            # LEVEL 5: STABILIZED NATIVE
            # We restore explicit Viewport and UA to strict common values.
            # Leaving them 'native' caused a regression (likely weird window dimensions).
            
            context = await self.playwright.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                channel="chrome", # Real System Chrome
                headless=False,
                args=args,
                # Force specific common fingerprint
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=1,
                
                locale="en-US",
                timezone_id="America/New_York",
                permissions=["microphone", "camera"],
                ignore_default_args=["--enable-automation"],
                java_script_enabled=True,
                bypass_csp=True,
            )
            
            # Stealth scripts - LEVEL 2 HARDENING (HEMR)
            await context.add_init_script("""
                // 1. Hide Automation / WebDriver
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                
                // 2. Mock Plugins (Chrome usually has these)
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                
                // 3. Realistic Hardware Concurrency & Memory
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
                Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
                
                // 4. WebGL Vendor Masking (Apple M1 simulation)
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    // UNMASKED_VENDOR_WEBGL
                    if (parameter === 37445) return 'Google Inc. (Apple)';
                    // UNMASKED_RENDERER_WEBGL
                    if (parameter === 37446) return 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)';
                    return getParameter.apply(this, arguments);
                };
                
                console.log("HEMR: Browser Environment Hardened.");
            """)

            self.active_contexts[agent_id] = context
            logger.info(f"Persistent Browser for Agent {agent_id} Launched.")
            return context

    async def start(self):
         """Legacy start method if needed, but we prefer agent-specific launch."""
         if not self.playwright:
             self.playwright = await async_playwright().start()

    async def close_agent_context(self, agent_id: str):
        if agent_id in self.active_contexts:
            await self.active_contexts[agent_id].close()
            del self.active_contexts[agent_id]
            logger.info(f"Closed context for Agent {agent_id}")

    async def close(self):
        for agent_id in list(self.active_contexts.keys()):
            await self.close_agent_context(agent_id)
            
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
        logger.info("Headless Browser Service Closed.")

# Global Singleton
browser_service = HeadlessBrowserService()
