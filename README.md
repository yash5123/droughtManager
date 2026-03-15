<div align="center">
  <img src="assets/aqvasense_banner.png" alt="AqvaSense Banner" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />
  <h1 align="center">🌊 AqvaSense</h1>
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

## 🌟 Overview

**AqvaSense** is a comprehensive, full-stack web application designed for government planning, disaster mitigation, and real-time monitoring of critical water resources. By tracking rainfall deficits, observing groundwater depletion, and managing emergency water tanker logistics across diverse geographical regions, the platform empowers authorities to make proactive, life-saving, data-informed decisions.

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

## 🛠️ Technology Stack

### Frontend Architecture
- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Visualization**: [Recharts](https://recharts.org/), [React-Leaflet](https://react-leaflet.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: React Router DOM

### Backend & Database (Planned)
- **Runtime Environment**: [Node.js](https://nodejs.org/en/) & [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ORM)
- **Authentication**: Firebase Auth / Custom JWT implementation
- **Deployment**: Vercel (Client) / Render (API Server)

---

## 🎨 UI/UX Design Principles

AqvaSense was built with a strict adherence to modern, premium aesthetics:
- **Glassmorphism**: Extensive use of backdrop-blurs, semi-transparent elements, and light borders to create a layered "glass" effect across dashboards.
- **Micro-interactions**: Hover events, smooth gradient transitions, and responsive re-rendering.
- **Dark Mode Sign-In**: A stunning, sleek dark theme dedicated to the authentication gateway, providing a striking contrast to the main administrative dashboard.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

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
