<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/1f4a7.svg" alt="AqvaSense Logo" width="72" style="margin-bottom: 10px;" />
  <h1 align="center">AqvaSense</h1>
  <h3 align="center">Advanced Drought & Water Resource Monitoring</h3>
  
  <p align="center">
    <strong>A next-generation, data-driven platform for government planning and disaster mitigation.</strong>
  </p>

  <p align="center">
    <img alt="React" src="https://img.shields.io/badge/react-18.x-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB"/>
    <img alt="TailwindCSS" src="https://img.shields.io/badge/tailwindcss-v3.4-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
    <img alt="Leaflet" src="https://img.shields.io/badge/react--leaflet-v4.x-%23199900.svg?style=for-the-badge&logo=Leaflet&logoColor=white"/>
    <img alt="NodeJS" src="https://img.shields.io/badge/node.js-backend-%236DA55F.svg?style=for-the-badge&logo=node.js&logoColor=white"/>
  </p>
</div>

---

## 🎯 The Mission

The escalating frequency of severe drought conditions requires a modernized, technological approach to water resource management. **AqvaSense** bridges the gap between raw environmental data and actionable government intervention. By centralizing rainfall statistics, groundwater depletion metrics, and population demands, authorities can shift from reactive emergency responses to proactive risk mitigation and automated logistics dispatching.

---

## ✨ Key Features

- 📊 **Real-time Analytics Dashboard**
  <p>Instant, beautiful overview of critical regions, active tankers, and water levels featuring interactive <code>Recharts</code> data visualizations natively supporting gradients and Area maps.</p>

- 🗺️ **Premium Geospatial Mapping**
  <p>Integrated interactive Leaflet maps displaying dynamic "Drought Impact Zones" (15km radius impact heatmaps) along with color-coded risk severity markers. Clicking markers activates smooth camera fly-to animations.</p>

- 💧 **Advanced Groundwater & Rainfall Monitoring**
  <p>Track aquifer depletion trends and rainfall shortages across entire districts with automated categorization (e.g., Severe Deficit vs Normal), backed by historical tracking capability.</p>

- 🚚 **Tanker Allocation & Logistics**
  <p>A dedicated interface to dispatch emergency water trucks to high-risk villages in real-time, compute expected times of arrival, and a dedicated UI to mark successful water-drop deliveries.</p>

- ⚠️ **Automated Risk Calculation Engine**
  <p>Algorithmic drought severity scoring driven by supply-vs-demand gaps, population density, and long-term environmental factors to generate actionable "Drought Priority" lists.</p>

- 🔔 **Live Alerts System**
  <p>Simulated real-time notification dropdown dynamically built into the sleek sidebar and top navigation for tracking critical environmental events and operational successes across the region.</p>

- 📑 **Data Export & Reporting**
  <p>One-click generation of comprehensive CSV reports aggregating the current system's overarching metrics directly from the dashboard for government record-keeping and external audits.</p>

- 📱 **Fully Responsive Glassmorphic UI**
  <p>Architected from the ground up for mobile compatibility, featuring a sliding-drawer menu natively responsive to touch devices, all styled with deeply immersive "glass card" aesthetics using Tailwind CSS.</p>

---

## 🏗️ System Architecture & Core Modules

AqvaSense is designed with a monolithic frontend and modular component architecture focusing on domain-driven design. The application is comprised of several distinct analytical modules:

### 1. The Risk Classification Engine
Drought severity isn't just about lack of rain—it's a multi-variable equation. The Risk Calculation module computes a holistic "Risk Score" out of 100 based on:
- **Rainfall Deficit** (Weight: 40%)
- **Groundwater Depletion** (Weight: 30%)
- **Population Density & Water Demand Gap** (Weight: 30%)

Villages are then automatically bucketed into classifications: **High**, **Moderate**, or **Low** Risk.

### 2. Supply vs. Demand Intelligence
Visualizes the exact gap between liters of water available natively versus the daily consumption rate per capita. This allows administrators to accurately predict exactly how many supplementary tankers are required to sustain a population.

### 3. Tanker Logistics & Dispatch
Instead of relying on phone calls, the platform features a centralized dispatch grid. Operators can view available trucks, assign them to critical villages, receive calculated ETAs, and utilize a one-click completion system to mark drops as fulfilled.

---

## 🛠️ Technology Stack

### Frontend Architecture
- **Framework**: [React](https://reactjs.org/) (Function components, hooks) + [Vite](https://vitejs.dev/) for extremely fast HMR.
- **Styling Methodologies**: Utility-first CSS via [Tailwind CSS](https://tailwindcss.com/) combined with custom global CSS mapping for glassmorphism classes (`.glass-card`).
- **Data Visualization**: [Recharts](https://recharts.org/) for area, bar, and custom scatter plots. [React-Leaflet](https://react-leaflet.js.org/) for DOM-based interactive map mounting.
- **Icons**: [Lucide React](https://lucide.dev/) for clean, consistent UI iconography.
- **Routing**: Client-side single-page routing via React Router DOM.

### Backend & Database Integrations (Planned/Simulated)
- **Runtime Environment**: [Node.js](https://nodejs.org/en/) & [Express.js](https://expressjs.com/) for building RESTful endpoints.
- **Database**: [MongoDB](https://www.mongodb.com/) utilizing Mongoose for NoSQL document modeling of Village schemas, Tanker statuses, and historical rainfall data.
- **Authentication**: Firebase Authentication or Custom JWT implementation handling Auth Context on the frontend.
- **Environment**: Cloud-native deployment intended for Render (Backend) and Vercel (Frontend).

---

## 🎨 UI/UX Design Principles

AqvaSense was built with strict adherence to modern, premium aesthetics designed to prevent operator fatigue:
- **Immersive Glassmorphism**: Extensive use of backdrop-blurs, semi-transparent layered elements, and exceedingly light colored borders to create an organic "glass" effect across dashboards without relying on flat, solid colors.
- **Micro-interactions**: Hover events, smooth gradient transitions, and responsive re-rendering encourage user engagement.
- **Dark Mode Auth Gateway**: A stunning, sleek dark theme dedicated to the authentication/login gateway, providing a striking, secure contrast to the main administrative dashboard.

---

## 🤝 Contributing

We believe in open-source solutions for global environmental challenges. 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <b>Built for a sustainable future. 💧</b>
</div>
