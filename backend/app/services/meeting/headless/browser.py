import logging
import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

logger = logging.getLogger(__name__)

class HeadlessBrowserService:
    """
    Manages the lifecycle of a Headless Chromium browser for meeting automation.
    """
    def __init__(self):
        self.playwright = None
        self.browser: Browser = None
        self._lock = asyncio.Lock()

    async def launch(self):
        async with self._lock:
            if self.browser:
                return

            logger.info("Launching Headless Browser...")
            self.playwright = await async_playwright().start()
            
            # Launch Args for WebRTC/Media fakery (crucial for Meet to accept us)
            self.browser = await self.playwright.chromium.launch(
                headless=True, # Set to False for debugging visually
                args=[
                    "--use-fake-ui-for-media-stream", # Auto-accept mic/cam permission
                    "--use-fake-device-for-media-stream", # Feeds fake audio/video
                    "--disable-blink-features=AutomationControlled", # Anti-bot detection
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage" # Prevents crash in Docker/Low Memory envs
                ]
            )
            logger.info("Headless Browser Launched.")

    async def new_context(self) -> BrowserContext:
        """
        Creates a new incognito context for a meeting session.
        """
        if not self.browser:
            await self.launch()

        context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            permissions=["microphone"], # Pre-grant mic permission
            viewport={"width": 1280, "height": 720}
        )
        return context

    async def close(self):
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
        logger.info("Headless Browser Closed.")

# Global Singleton
browser_service = HeadlessBrowserService()
