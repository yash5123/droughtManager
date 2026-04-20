<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0ea5e9,50:6366f1,100:8b5cf6&height=180&section=header&text=&fontSize=0" width="100%" />

<div align="center">

  <img src="https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/1f4a7.svg" alt="AqvaSense Logo" width="80" />

  <h1>💧 AqvaSense</h1>

  [![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=6366F1&center=true&vCenter=true&multiline=true&width=650&height=90&lines=Real-Time+Drought+%26+Water+Resource+Monitoring;Interactive+Maps+%7C+Risk+Scoring+%7C+Tanker+Dispatch;Built+for+smarter+water+management+%F0%9F%8C%8D)](https://git.io/typing-svg)

  <br/>

  [![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-blueviolet?style=for-the-badge)](https://drought-manager-wheat.vercel.app/)
  [![Status](https://img.shields.io/badge/Status-Active-43aa8b?style=for-the-badge&logo=statuspage&logoColor=white)](https://drought-manager-wheat.vercel.app/)

  <br/>

  ![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  ![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)

  <br/>

  *A gorgeous, data-driven dashboard that helps monitor drought conditions, track groundwater levels, dispatch emergency water tankers, and predict future water crises — all from one place.*

</div>

<br/>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

## 🎯 About

**AqvaSense** is a full-stack drought monitoring and water resource management platform designed for the Maharashtra region of India. It takes complex environmental data — rainfall levels, groundwater depths, population water demand — and turns it into beautiful, interactive visuals that anyone can understand at a glance.

Instead of spreadsheets and phone calls, AqvaSense gives you a glassmorphic dashboard with live maps, risk scores, tanker logistics, and even AI-generated action plans. It's the kind of tool that turns reactive "we're out of water" emergencies into proactive "we saw this coming three months ago" planning.

> [!NOTE]
> 🗺️ AqvaSense monitors **5 real villages** across Maharashtra — Hiware Bazar, Ralegan Siddhi, Kadwanchi, Patoda, and Shirpur — spanning **4 districts** (Ahmednagar, Jalna, Beed, and Dhule) with real geographic coordinates plotted on interactive maps!

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

## 🌐 Live Demo

<div align="center">

  [![🌐 Try AqvaSense Now](https://img.shields.io/badge/🌐_Try_AqvaSense_Now-Click_Here-ff69b4?style=for-the-badge&logoColor=white)](https://drought-manager-wheat.vercel.app/)

  *👆 Go ahead, click it. See drought management done beautifully.*

</div>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

## 🔄 How It Works

Here's the full user journey — from login to action:

1. 🔐 **Authenticate** — You're greeted by a sleek dark-mode login screen. Sign up with email & password, or tap the Google OAuth button to jump straight in.

2. 🖥️ **Hit the Dashboard** — Instantly see the big picture: total villages monitored, critical regions, active tankers, and average rainfall — all in animated stat cards. Two beautiful gradient area charts show you rainfall trends and groundwater levels at a glance.

3. 🗺️ **Explore the Map** — Switch to the Geospatial Overview and see every village pinned on an interactive Leaflet map with **15 km drought impact radius zones**. Red = danger. Amber = watch out. Green = safe. Click any marker and the camera smoothly flies to that village with a detailed popup.

4. 🌧️ **Analyze Rainfall & Groundwater** — Dive into per-village bar charts that instantly flag which villages are in severe rainfall deficit (bars turn red!) and which aquifers are dangerously deep.

5. ⚠️ **Calculate Risk** — Play with the interactive sliders for Rainfall Deficit, Groundwater Depletion, and Population Demand Gap. The weighted algorithm instantly computes a risk score out of 100 and classifies it as **SAFE**, **MODERATE**, or **CRITICAL** with a gorgeous dark-mode result card.

6. 🚚 **Dispatch Tankers** — Pick a village, set the water volume, and hit "Allocate Truck." A new tanker appears in the live tracking panel with an ETA. When it arrives, mark it as delivered with one click.

7. 🔮 **Predict the Future** — View AI-driven drought probability forecasts per village on area charts, then hit "Generate AI Action Plan" for recommended emergency protocols (tanker deployment, rationing levels).

8. 📊 **Export Reports** — One click on the dashboard downloads a comprehensive CSV report with all current metrics — perfect for government record-keeping.

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

## ✨ Features

### 🏠 Core Dashboard
- 📊 **Real-Time Stat Cards** — Four animated cards showing Total Villages, Critical Regions, Active Tankers, and Average Rainfall with hover lift effects and gradient backgrounds.
- 📈 **Dual Area Charts** — Rainfall trends and groundwater levels rendered with smooth gradient fills using Recharts. Custom glassmorphic tooltips with backdrop blur.
- 📥 **One-Click CSV Export** — Generates a timestamped drought report (`Drought_Report_2026-04-20.csv`) with all system metrics, downloadable instantly from the browser.

> [!TIP]
> ✨ The dashboard stat cards have a cool micro-interaction — hover over them and they **float upward** while the background gradient blob **scales up** behind them!

---

### 🗺️ Geospatial Mapping
- 🌍 **Interactive Leaflet Map** — Full pan/zoom map of Maharashtra centered on the CARTO Voyager basemap for a clean, modern look.
- 🔴 **Drought Impact Heatmap Rings** — Every village is surrounded by a 15 km color-coded risk radius (red/amber/green) showing the area of impact.
- 📍 **Fly-To Animations** — Click any village marker and the map smoothly animates to zoom into it. The popup reveals the village name, district, risk level, and risk score.
- 🟢 **Color-Coded Risk Legend** — Built-in legend pills at the top (High Risk / Moderate / Low Risk) so you always know what the colors mean.

> [!TIP]
> ✨ The map uses **CircleMarker** with white borders for the village dots and larger **Circle** overlays for the heatmap zones — creating a really satisfying "bullseye" visual effect!

---

### ⚠️ Risk Intelligence Engine
- 🎛️ **Interactive Risk Calculator** — Three range sliders let you adjust Rainfall Deficit, Groundwater Depletion, and Population Demand Gap in real time. The weighted formula (`0.40×R + 0.35×GW + 0.25×P`) spits out a score instantly.
- 🍩 **Weight Distribution Donut Chart** — A Recharts donut chart visually breaks down how each factor contributes to the final score.
- 🏷️ **Auto-Classification** — Villages are bucketed into Critical (score > 75), Moderate (40–75), or Normal (< 40) with color-coded progress bars.
- 📋 **Risk Classification Board** — Three big counter cards at the top show how many villages fall into each risk bucket, with gradient color bars at their base.

---

### 🚚 Tanker Logistics & Dispatch
- 🆕 **Dispatch Form** — Select a target village from a dropdown, set the volume in liters (min 1,000, step 500), and allocate a truck with a random ID like `TNK-4827`.
- 📡 **Live Tracking Panel** — En-route tankers show up in a timeline view with their ETA and a green checkmark button to mark them as delivered.
- 📊 **Volume Allocation Bar Chart** — A gradient bar chart shows how many liters have been allocated per village.
- 🃏 **Tanker Cards** — Each tanker gets a premium card with a dark gradient header, status badge (Enroute/Delivered/Pending), capacity, ETA, and a "Mark as Delivered" button.

---

### 🌧️ Environmental Monitoring
- 💧 **Rainfall Analysis** — Bar chart with conditional coloring — bars turn **red** when rainfall drops below 50 mm (severe deficit) and stay **blue** when normal.
- 🕳️ **Groundwater Depth Tracking** — Visualizes aquifer depth in meters per village. Bars turn **amber** when depth exceeds 30 m (depleted). Each village card gives a human-readable status.
- 📉 **Supply vs Demand Composite Chart** — A combined bar + line chart overlays population demand (gradient bars) against current supply (amber line) per village, with an insights panel flagging surpluses and deficits.

---

### 🔮 Prediction & AI
- 📉 **Drought Probability Forecasts** — Per-village area charts show historical trends (dashed line) vs. AI predictions (purple gradient fill) from April through August.
- 🤖 **Generate AI Action Plan** — Hit the button and watch a loading spinner, then receive a protocol recommendation (e.g., "Deploy three 10,000L emergency tankers", "Activate rationing level 2").
- 📣 **Actionable Intelligence Cards** — Each village gets a purple insight card showing the predicted drought probability for August.

> [!IMPORTANT]
> 🔮 The Future Prediction page generates **unique forecasts per village** — each one has different historical baselines and prediction curves, so you're not just looking at the same chart five times!

---

### 🎨 UI & Experience
- 🪟 **Glassmorphism Everywhere** — Semi-transparent cards with `backdrop-blur`, subtle borders, and layered depth effects across the entire app.
- 🌑 **Dark Mode Auth Gateway** — The login screen uses a fully dark theme with slate-900 backgrounds, glowing blue accents, and a top-edge gradient shimmer.
- 📱 **Fully Mobile Responsive** — A hamburger menu triggers a sliding-drawer sidebar with backdrop blur on mobile. The map, charts, and cards all reflow beautifully.
- 🔔 **Live Alerts System** — A notification bell with an unread badge count. Click it to see a dropdown of critical updates (groundwater drops, tanker deliveries, rainfall forecasts).
- 👤 **User Profile in Sidebar** — Shows your name initial in a blue avatar circle, plus your email below. Logout button at the bottom.
- ✨ **Micro-Animations** — Fade-in page transitions, slide-up card animations, hover lift effects on stat cards, and scale transforms on background blobs.

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

## 💡 Who Can Use This?

| 👤 Who | 🎯 What they do with it |
|--------|------------------------|
| 🏛️ Government Officials | Monitor drought-hit regions and prioritize emergency water tanker allocations across districts |
| 🌾 District Collectors | Get a bird's-eye view of rainfall deficits and groundwater depletion to decide where to deploy resources |
| 🚰 Water Resource Engineers | Track supply vs. demand gaps and make data-backed decisions about pumping schedules |
| 🎓 Students & Researchers | Explore a beautifully built full-stack project covering maps, charts, auth, and REST APIs |
| 🚚 Tanker Fleet Managers | Manage truck dispatch, track deliveries in real time, and mark water drops as completed |
| 🌍 NGOs & Relief Orgs | Identify the most at-risk villages and plan relief operations using predictive drought models |
| 📊 Data Analysts | Export CSV reports of system metrics for offline analysis and government audits |
| 🏫 Hackathon Teams | Draw inspiration from a polished, production-grade UI with glassmorphism, animated charts, and maps |

> [!IMPORTANT]
> 🏛️ **For Government Planners** — The supply-vs-demand module alone can change how water budgets are allocated. By showing the exact liter-level gap between what a village needs and what it has, authorities can go from guessing to precision resource allocation.

> [!TIP]
> 🎓 **For Fellow Students** — This project is a great reference for building full-stack apps with React 19, Vite 8, Tailwind CSS 4, Node.js/Express, MongoDB/Mongoose, Google OAuth, JWT auth, Leaflet maps, and Recharts — all in one codebase!

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

## 🛠️ Built With

| Technology | What it does in THIS project |
|---|---|
| ![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) | Powers the entire SPA — 10 pages, routing, context-based auth, and all interactive UI components |
| ![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white) | Lightning-fast dev server with HMR that makes the build feel instant |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white) | The magic behind the glassmorphism cards, gradient blobs, backdrop blurs, and responsive layouts |
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) | Runs the backend server with Express 5, handling 7 RESTful API route groups |
| ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white) | Stores user accounts, village data, tanker statuses, and rainfall records via Mongoose 9 |
| ![Leaflet](https://img.shields.io/badge/React_Leaflet_5-199900?style=for-the-badge&logo=leaflet&logoColor=white) | Renders the interactive geospatial map with CARTO tiles, circle markers, heatmap rings, and fly-to animations |
| ![Recharts](https://img.shields.io/badge/Recharts_3-ff69b4?style=for-the-badge&logo=chart.js&logoColor=white) | Creates every chart — area, bar, composed, pie/donut — all with gradient fills and custom tooltips |
| ![Google OAuth](https://img.shields.io/badge/Google_OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white) | One-tap Google Sign-In on the frontend verified with `google-auth-library` on the backend |
| ![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white) | 7-day token-based sessions with bcrypt-hashed passwords stored in MongoDB |
| ![Lucide](https://img.shields.io/badge/Lucide_Icons-f56565?style=for-the-badge&logo=lucide&logoColor=white) | 15+ beautifully consistent icons (Droplet, Truck, CloudRain, MapPin, Bell, etc.) across every page |
| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) | Hosts the production frontend with zero-config deployment |

The tech stack was carefully chosen to be **modern but practical** — React 19 for the latest hooks and concurrent features, Tailwind v4 for next-gen CSS, and Express 5 on the backend. Everything from auth to charts to maps is wired up end-to-end.

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

## 🤓 Did You Know?

> [!NOTE]
> 💬 The risk calculation algorithm uses a **weighted multi-variable formula**: `Risk = 0.40 × Rainfall Deficit + 0.35 × Groundwater Depletion + 0.25 × Population Demand Gap` — designed to reflect that rain matters most, but water table and population pressure can't be ignored.

> [!NOTE]
> 💬 Each village on the map has a **15,000-meter (15 km) impact radius circle** drawn around it — that's roughly the area affected by drought conditions radiating from the village center.

> [!NOTE]
> 💬 The login page uses a **top-edge glow effect** — a 1px gradient line (`from-transparent via-blue-400/30 to-transparent`) combined with a blurred radial beneath it to create that subtle "light source above the card" illusion!

> [!NOTE]
> 💬 Passwords are hashed using **bcrypt with 10 salt rounds** before storage, and Google OAuth tokens are verified server-side using Google's official `google-auth-library` — not just trusted from the frontend.

> [!NOTE]
> 💬 The CSV export function builds the file **entirely in-browser** using a Blob and automatic download link injection — no server round-trip needed!

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" />

<div align="center">

  <br/>

  **Made with ❤️ and lots of ☕ by the developer**

  <br/>

  ![Stars](https://img.shields.io/github/stars/yash5123/droughtManager?style=for-the-badge&color=f59e0b&logo=github)
  ![Forks](https://img.shields.io/github/forks/yash5123/droughtManager?style=for-the-badge&color=6366f1&logo=github)

  <br/>

  *💧 Every drop counts. Every village matters.*

  <br/>

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0ea5e9,50:6366f1,100:8b5cf6&height=120&section=footer" width="100%" />
