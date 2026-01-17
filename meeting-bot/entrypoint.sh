#!/bin/bash

# Start PulseAudio daemon
# We use --exit-idle-time=-1 to keep it running
pulseaudio -D --exit-idle-time=-1

# Create Virtual Mic (Sink) that Chrome will read from (via monitor remap) but actually it's easier to just use standard sinks.
# Strategy: 
# 1. Create a null-sink for "SpeakerOutput" (Where Chrome plays audio)
# 2. Create a null-sink for "MicInput" (Where we play audio for Chrome to hear)

# Load null sinks
pactl load-module module-null-sink sink_name=SpeakerOutput sink_properties=device.description=SpeakerOutput
pactl load-module module-null-sink sink_name=MicInput sink_properties=device.description=MicInput

# Set default sink to SpeakerOutput so Chrome plays there automatically
pactl set-default-sink SpeakerOutput

# Start Xvfb (Virtual Screen) - Optional if using pure headless but better for some meet platforms
Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99

echo "Audio System Initialized. Starting Bot Controller..."
exec npm start
