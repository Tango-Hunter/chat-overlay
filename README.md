# 🎮 Digital Terminal Chat Overlay

A customizable Twitch chat overlay designed around a digital terminal aesthetic for OBS.

The project combines a responsive HTML/CSS/JavaScript overlay with a Node.js backend that connects to Twitch and delivers chat events in real time.

---

## 👤 Contributors
- Tango Hunter

---

## 📖 Overview

Digital Terminal Chat Overlay is a custom Twitch chat overlay designed for use as an OBS Browser Source. The overlay presents Twitch chat through a terminal-inspired interface featuring viewer avatars, configurable typography, animated message entry, and a typewriter effect with a blinking terminal cursor.

The project is designed to be hosted through Railway, allowing the Twitch integration and overlay to remain available without requiring a local server on the streaming PC. Configuration is centralized so visual settings can be easily adjusted without modifying the core application.

---

## 🚀 Features
- Custom digital terminal-style Twitch chat overlay
- Designed for OBS Browser Sources
- Responsive to Browser Source dimensions
- Twitch chat integration
- Real-time chat messages
- Viewer avatars
- Customizable usernames and colors
- Configurable font and font size
- Configurable terminal appearance
- Typewriter-style message animation
- Configurable typing speed
- Blinking terminal cursor
- Configurable message history
- Configurable visual effects
- Twitch emote support
- Expandable Twitch event support
- Railway hosting

---

## 🛠 Tech Stack
- HTML5
- CSS3
- JavaScript
- Node.js
- Twitch API
- Twitch EventSub
- WebSockets
- OBS Browser Source
- Railway
- GitHub

---

## 📌 Notes
- The overlay is designed around the Digital Overlord / Tango Hunter visual style.
- Primary interface color is neon green `#00ff78`.
- Overlay dimensions are controlled by the OBS Browser Source rather than being hard-coded.
- Visual settings will be stored in a centralized JavaScript configuration object.
- Twitch authentication credentials will be stored securely as environment variables.
- The application is intended to run remotely through Railway rather than as a local server.
- Additional Twitch events and visual effects may be added as the project develops.

---

### 📜 License

MIT License Copyright (c) 2026 Tango Hunter
