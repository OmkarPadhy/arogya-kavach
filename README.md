# Arogya Kavach

## Intelligence for Health & Safety

Arogya Kavach is an intelligent worker health and safety monitoring platform designed to provide a unified view of worker safety, environmental conditions, alerts, communication status, and operational analytics.

The platform combines real-time monitoring, safety intelligence, environmental awareness, worker status tracking, location visualization, alerts, and analytics into a single web-based interface.

---

## Objective

The objective of Arogya Kavach is to provide organizations with a centralized safety intelligence platform that can:

- Monitor worker health and safety conditions.
- Monitor environmental conditions.
- Detect and highlight critical safety events.
- Provide worker and site-level safety visibility.
- Visualize worker and infrastructure locations.
- Track communication and network status.
- Provide real-time alerts for abnormal conditions.
- Provide historical sensor data and analytics.
- Support both demonstration data and real prototype data.
- Provide role-based access to the platform.

The platform is designed to move workplace safety from reactive observation toward continuous monitoring and intelligent decision support.

---

## Platform Overview

Arogya Kavach follows a modular software architecture in which worker and site information is collected, processed, and presented through a centralized safety platform.

The web application provides interfaces for:

- Site overview
- Live environment monitoring
- Worker monitoring
- Safety alerts
- Network and gateway status
- Sensor analytics
- Administrative controls

The application can operate in two modes:

### Demo Mode

Demo Mode uses simulated worker and site telemetry for demonstrating the complete platform interface without requiring physical sensor data.

It provides multiple simulated workers, environmental conditions, alerts, gateways, and historical data.

### Real Prototype Mode

Real Prototype Mode connects the dashboard to the project's real prototype data source.

The current prototype integration represents the physical prototype as a single monitored worker/helmet node and displays the latest available sensor information in the platform.

Unavailable sensor values are handled as unavailable rather than being interpreted as valid measurements.

---

## Main Platform Features

### 1. Dashboard

The main dashboard provides a centralized overview of the safety environment.

It presents:

- Overall safety status
- Worker status
- Active alerts
- Environmental conditions
- Gateway/network status
- System status
- Key operational statistics

---

### 2. Live Environment

The Live Environment provides a visual representation of the monitored site.

It includes:

- Site zones
- Worker locations
- Gateway locations
- Safety status visualization
- Worker focus/selection
- Active safety alerts
- Location-based monitoring

The platform also supports opening an available worker location in Google Earth when valid geographical coordinates are available.

---

### 3. Worker Monitoring

The Workers section provides individual worker-level monitoring.

Worker information can include:

- Worker identity
- Role
- Zone
- Safety status
- Heart rate
- SpO2
- Temperature
- Humidity
- Gas measurements
- Fall/incident status
- Location
- Network status
- Last-seen information

The worker monitoring interface is designed to provide a quick view of individual safety conditions.

---

### 4. Safety Alerts

The Alerts section provides centralized visibility into safety events.

Alerts can be generated or represented for conditions such as:

- Fall detection
- Abnormal physiological conditions
- Environmental hazards
- Gas-related conditions
- Network/device issues
- Critical worker conditions

Alerts are classified according to their severity and status.

---

### 5. Network & Gateway Monitoring

The Network section provides visibility into communication infrastructure.

It represents:

- Gateway status
- Connectivity
- Network condition
- Gateway configuration
- Device communication information

The platform includes an interface for gateway/device integration as the system evolves toward a complete field deployment architecture.

---

### 6. Analytics

The Analytics section provides historical and statistical views of monitored data.

It can be used to analyze:

- Physiological measurements
- Environmental measurements
- Sensor trends
- Worker safety conditions
- Alert patterns
- Historical telemetry

The purpose is to convert raw monitoring data into information useful for safety analysis and operational decision-making.

---

### 7. Administration

The Administration section provides platform-level controls.

It includes functionality related to:

- Users
- Roles
- Access
- System configuration
- Platform status

The application supports role-based platform users such as:

- Administrator
- Safety Supervisor
- Operator

---

## Authentication

Arogya Kavach supports two access modes.

### Demo Access

Demo Mode provides direct access to the demonstration environment.

### Real Prototype Authentication

Real Prototype Mode uses an external authentication service to validate platform credentials.

User information includes:

- Username
- Display name
- Role
- Account status
- Login state

The authentication architecture allows credentials to be managed outside the frontend application.

---

## Data Architecture

The application separates platform data handling from the user interface.

The major software layers include:

- Authentication services
- Data services
- Platform state management
- Worker/site data models
- UI components
- Visualization components
- Route-level application views

The application maintains a common platform snapshot containing information about:

- Site
- Workers
- Zones
- Gateways
- Alerts
- System update state

This allows different parts of the application to consume the same platform state.

---

## Technology Stack

The project is implemented as a modern TypeScript web application.

### Core Technologies

- React
- TypeScript
- TanStack Start
- TanStack Router
- Vite
- Tailwind CSS
- Three.js
- Recharts
- Lucide Icons

### Application Architecture

The project uses:

- Component-based React architecture
- TypeScript data models
- Centralized platform state
- Service-based data access
- Route-based application pages
- 3D site visualization
- Interactive charts
- Responsive dashboard interfaces

---

## Project Structure

The application is organized into major areas such as:

```text
src/
├── components/
│   └── layout/
├── data/
├── lib/
├── routes/
├── services/
├── state/
└── three/

Important Areas

src/routes/

Contains the application's major platform pages and navigation routes.

src/components/

Contains reusable interface and layout components.

src/services/

Contains application services such as authentication and data access.

src/state/

Contains centralized platform state and application context.

src/data/

Contains the application's data models and demonstration data.

src/three/

Contains the Three.js-based site/environment visualization.

src/lib/

Contains supporting utilities such as geographical coordinate mapping.

public/

Contains static assets used by the application, including Arogya Kavach branding assets.

Data Modes

The platform is designed to support both simulated and real data sources.

Simulated Data

Simulated telemetry is used to demonstrate the platform when a physical data source is not connected.

The simulation can update worker telemetry over time to demonstrate changing safety conditions.

Real Data

The real prototype mode consumes data provided by the prototype's external data service.

The application converts unavailable measurements into explicit unavailable states instead of treating missing measurements as actual zero-valued readings.

Safety Status Model

The platform uses safety states to simplify operational interpretation.

Supported safety states include:

NORMAL
WARNING
CRITICAL
OFFLINE

These states are derived from worker condition, alerts, connectivity, and monitored measurements.

Network Status Model

Network connectivity is represented using:

CONNECTED
WEAK
DISCONNECTED

This allows communication health to be considered separately from the worker's safety condition.

Development

Install project dependencies:

npm install

Run the development server:

npm run dev

Build the application:

npm run build

Run linting:

npm run lint

Format the project:

npm run format
Deployment

The application is intended to be deployable as a modern web application using Vercel.

The project uses TanStack Start and its associated server/build configuration.

Production deployment can be connected directly to a GitHub repository so that future changes can be deployed automatically.

Project Purpose

Arogya Kavach is being developed as a technology platform for intelligent workplace health and safety.

The software focuses on bringing worker monitoring, environmental awareness, safety alerts, location intelligence, connectivity information, and analytics together into one operational interface.

The long-term objective is to provide a scalable safety intelligence layer that can integrate different sensing and communication systems while maintaining a simple interface for supervisors and operators.

Current Development Status

The project currently contains:

Web-based Arogya Kavach dashboard
Demo Mode
Real Prototype Mode
Authentication
Worker monitoring interface
Environmental monitoring interface
Safety alert interface
Network/gateway interface
Analytics interface
Administrative interface
3D site visualization
Historical sensor visualization
Real prototype data integration
Arogya Kavach branding

The platform is under active development and additional hardware, communication, intelligence, and deployment capabilities can be integrated progressively.