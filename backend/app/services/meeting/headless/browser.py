import logging
import asyncio
import os
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

logger = logging.getLogger(__name__)

class HeadlessBrowserService:
    """
    Manages the lifecycle of a Headless Chromium browser for meeting automation.
    """
    def __init__(self):
        self.playwright = None
        self.browser_context = None # Changed from self.browser to self.browser_context for persistence
        self.user_data_dir = os.path.join(os.getcwd(), "chrome_data") # Persistent Profile Directory
        self._lock = asyncio.Lock()

    async def launch(self):
        """
        Launches a PERSISTENT browser context. 
        This saves cookies/login state to ./chrome_data, making the bot appear as a 'returning user'.
        """
        async with self._lock:
            if self.browser_context:
                return

            logger.info(f"Launching Persistent Browser (Profile: {self.user_data_dir})...")
            self.playwright = await async_playwright().start()
            
            # Launch Persistent Context (Mix of Browser + Context)
            self.browser_context = await self.playwright.chromium.launch_persistent_context(
                user_data_dir=self.user_data_dir,
                headless=True, # Change to False if you need to see the login screen manually once
                args=[
                    "--use-fake-ui-for-media-stream",
                    "--use-fake-device-for-media-stream",
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-software-rasterizer",
                    "--disable-extensions",
                    "--exclude-switches=enable-automation", 
                    "--disable-infobars",
                    "--window-size=1280,720"
                ],
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                locale="en-US",
                permissions=["microphone"],
                viewport={"width": 1280, "height": 720},
                timezone_id="America/New_York",
                color_scheme="light"
            )
            logger.info("Persistent Browser Launched.")

    async def new_context(self) -> BrowserContext:
        """
        Returns the existing persistent context.
        """
        if not self.browser_context:
            await self.launch()
        
        # specific page handling if needed, but for persistence we return the main context
        return self.browser_context

    async def close(self):
        if self.browser_context:
            await self.browser_context.close()
            self.browser_context = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
        logger.info("Headless Browser Closed.")

# Global Singleton
browser_service = HeadlessBrowserService()
