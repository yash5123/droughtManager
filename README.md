<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/droplet.svg" alt="Drop" width="100"/>
  <h1>AqvaSense | Drought Monitoring</h1>
  <p><strong>Advanced Data-Driven Water Resource Management System</strong></p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB"/>
    <img alt="TailwindCSS" src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
    <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet-%23199900.svg?style=for-the-badge&logo=Leaflet&logoColor=white"/>
    <img alt="NodeJS" src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white"/>
    <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white"/>
  </p>
</div>

---

## 🌟 Overview

**AqvaSense** is a comprehensive, full-stack web application designed for government planning, disaster mitigation, and real-time monitoring of critical water resources. By tracking rainfall deficits, observing groundwater depletion, and managing emergency water tanker logistics across diverse geographical regions, the platform empowers authorities to make proactive, life-saving, data-informed decisions.

## ✨ Key Features

- 📊 **Real-time Analytics Dashboard**: Instant, beautiful overview of critical regions, active tankers, and water levels featuring interactive `Recharts` data visualizations natively supporting gradients and Area maps.
- 🗺️ **Premium Geospatial Mapping**: Integrated interactive Leaflet maps displaying dynamic "Drought Impact Zones" (15km radius impact heatmaps) along with color-coded risk severity markers. Clicking markers activates smooth camera fly-to animations.
- 💧 **Advanced Groundwater & Rainfall Monitoring**: Track aquifer depletion trends and rainfall shortages across entire districts with automated categorization (e.g., Severe Deficit vs Normal), backed by historical tracking capability.
- 🚚 **Tanker Allocation & Logistics**: A dedicated interface to dispatch emergency water trucks to high-risk villages in real-time, compute expected times of arrival, and a dedicated UI to mark successful water-drop deliveries.
- ⚠️ **Automated Risk Calculation Engine**: Algorithmic drought severity scoring driven by supply-vs-demand gaps, population density, and long-term environmental factors to generate actionable "Drought Priority" lists.
- 🔔 **Live Alerts System**: Simulated real-time notification dropdown dynamically built into the sleek sidebar and top navigation for tracking critical environmental events and operational successes across the region.
- 📑 **Data Export & Reporting**: One-click generation of comprehensive CSV reports aggregating the current system's overarching metrics directly from the dashboard for government record-keeping and external audits.
- 📱 **Fully Responsive Glassmorphic UI**: Architected from the ground up for mobile compatibility, featuring a sliding-drawer menu natively responsive to touch devices, all styled with deeply immersive "glass card" aesthetics using Tailwind CSS.

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
