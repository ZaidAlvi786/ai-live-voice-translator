const express = require('express');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());

let browser = null;
let page = null;
let audioProcess = null;

const HTTP_PORT = 3000;

app.post('/join', async (req, res) => {
    const { url, name } = req.body;
    console.log(`[Bot] Request to join: ${url} as ${name}`);

    if (browser) {
        return res.status(409).json({ error: "Bot already in a meeting" });
    }

    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome-stable',
            headless: false, // We use Xvfb, so false is okay/better for detection
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--use-fake-ui-for-media-stream', // Auto-allow mic/cam
                '--window-size=1280,720',
                // Tell Chrome to use PulseAudio
                '--alsa-output-device=plug:default'
            ]
        });

        page = await browser.newPage();

        // Grant permissions
        const context = browser.defaultBrowserContext();
        await context.overridePermissions(url, ['microphone', 'camera']);

        await page.goto(url);

        // Here we would implement platform-specific selectors (Zoom, Meet, etc.)
        // This is where "Page interaction logic" goes. 
        // For a demo, we just stay on the page.

        res.json({ status: "joined", session_id: "123" });

        // Start Audio Capture Stream (FFmpeg reading from SpeakerOutput.monitor)
        startAudioCapture();

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
        if (browser) {
            await browser.close();
            browser = null;
        }
    }
});

app.post('/leave', async (req, res) => {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
        if (audioProcess) audioProcess.kill();
    }
    res.json({ status: "left" });
});

function startAudioCapture() {
    // Capture from PulseAudio monitor of the SpeakerOutput sink
    // Stream to Backend via WebSocket or UDP? 
    // For simplicity of scaffold, we just log.
    console.log("[Bot] Starting Audio Capture...");

    // Example FFmpeg command to record monitor
    // ffmpeg -f pulse -i SpeakerOutput.monitor ...
}

app.listen(HTTP_PORT, () => {
    console.log(`Bot Controller listening on port ${HTTP_PORT}`);
});
