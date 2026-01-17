FROM node:18-bullseye-slim

# Install system dependencies including Chrome and Audio tools
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    pulseaudio \
    pulseaudio-utils \
    xvfb \
    ffmpeg \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./

# Install Node dependencies
RUN npm install

# Copy application code
COPY . .

# Add non-root user for security (Chrome requires this or --no-sandbox)
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Switch to non-root user
USER pptruser

# Expose API port
EXPOSE 3000

# Entrypoint script to handle PulseAudio daemon
ENTRYPOINT ["./entrypoint.sh"]
