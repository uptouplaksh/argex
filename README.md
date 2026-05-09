# ARGEX

![Version](https://img.shields.io/badge/version-v1.0-blue)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![Database](https://img.shields.io/badge/database-PostgreSQL-336791)
![License](https://img.shields.io/badge/license-MIT-green)

> Secure Real-Time Auction Intelligence Platform

ARGEX is a cybersecurity-aware real-time auction platform engineered to combine modern online bidding workflows with intelligent monitoring and defensive security mechanisms. The platform integrates live WebSocket-based bidding, automated bidding workflows, wallet and currency management, role-based access control, anomaly detection, and defender-oriented monitoring systems within a unified full-stack architecture.

Designed as both a marketplace system and a cyber-aware transactional environment, ARGEX focuses on operational transparency, live synchronization, secure user interaction, and scalable auction management while maintaining a modern responsive user experience.

---
# ✨ Core Features

| Feature | Description | Role Access | Status |
|---|---|---|---|
| Real-Time Bidding | Live auction bidding using WebSocket synchronization | Bidder, Seller | ✅ |
| Auto-Bidding Engine | Automatically places bids based on user-defined limits | Bidder, Seller | ✅ |
| Live Auction Marketplace | Dynamic marketplace displaying active and upcoming auctions | All Users | ✅ |
| Role-Based Access Control | Dedicated access separation for Admin, Defender, Seller, and Bidder | System Wide | ✅ |
| Wallet System | User account balance management for auction participation | Bidder, Seller | ✅ |
| Multi-Currency Support | Real-time currency conversion and preferred currency handling | All Users | ✅ |
| SMTP Email Verification | Email-based OTP verification during authentication workflows | All Users | ✅ |
| Security PIN Authentication | Secondary PIN validation layer for sensitive actions | All Users | ✅ |
| Watchlist Management | Save and monitor auctions of interest | Bidder, Seller | ✅ |
| Notification System | Real-time notifications for bids, events, and actions | All Users | ✅ |
| Seller Request Workflow | Bidder-to-seller role request and approval system | Bidder, Admin | ✅ |
| Auction Creation & Management | Seller dashboard for creating and managing auctions | Seller | ✅ |
| Auction Status Tracking | Live tracking for active, upcoming, ended, and cancelled auctions | All Users | ✅ |
| Defender Dashboard | Centralized monitoring dashboard for suspicious activity analysis | Defender | ✅ |
| Security Incident Monitoring | Tracks and logs suspicious auction and user activities | Defender | ✅ |
| Risk Scoring System | Dynamic user risk assessment and anomaly scoring | Defender | ✅ |
| Audit Logging System | Tracks critical actions performed within the platform | Admin, Defender | ✅ |
| Category Management | Dynamic auction category management system | Admin | ✅ |
| Responsive Dark/Light UI | Adaptive modern UI with theme switching support | All Users | ✅ |
| Responsive Design | Mobile-friendly responsive frontend architecture | All Users | ✅ |

---

# 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Tailwind CSS, Vite |
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| Real-Time Communication | WebSockets |
| Authentication | JWT, SMTP OTP Verification, Security PIN |
| Security Systems | Risk Scoring, Incident Monitoring, Audit Logs |
| Development Tools | PyCharm, Git, GitHub |

---

# 🏗️ System Architecture Overview

```
Client Layer (React + Tailwind Frontend)
            ↓
FastAPI Backend API Layer
            ↓
Authentication & Security Services
            ↓
Auction Engine & WebSocket Communication
            ↓
PostgreSQL Database
````

---

# 👥 User Roles

| Role     | Responsibilities                                           |
| -------- | ---------------------------------------------------------- |
| Bidder   | Participate in auctions, place bids, manage watchlists     |
| Seller   | Create and manage auctions, monitor bids and earnings      |
| Defender | Monitor suspicious activities and security incidents       |
| Admin    | Manage categories, seller approvals, and system operations |

---

# 🛡️ Security Features

* JWT-based authentication and authorization
* SMTP email OTP verification workflow
* Security PIN validation layer
* Real-time risk score calculation
* Suspicious activity detection
* Security incident logging
* Defender monitoring dashboard
* Audit log tracking system
* Role-based protected routes and APIs
* Wallet validation for bidding operations

---

# 📁 Project Directory Structure

```
argex/
├── backend
│   ├── app
│   │   ├── api
│   │   │   ├── deps.py
│   │   │   ├── endpoints
│   │   │   │   └── notifications.py
│   │   │   ├── __init__.py
│   │   │   └── routes
│   │   │       ├── admin.py
│   │   │       ├── auction.py
│   │   │       ├── auth.py
│   │   │       ├── bid.py
│   │   │       ├── category.py
│   │   │       ├── currency.py
│   │   │       ├── defender.py
│   │   │       ├── __init__.py
│   │   │       ├── notifications.py
│   │   │       ├── roles.py
│   │   │       ├── security.py
│   │   │       ├── watchlist.py
│   │   │       └── ws.py
│   │   ├── core
│   │   │   ├── config.py
│   │   │   ├── connection_manager.py
│   │   │   ├── deps.py
│   │   │   ├── __init__.py
│   │   │   ├── security_monitor.py
│   │   │   └── security.py
│   │   ├── db
│   │   │   ├── base.py
│   │   │   ├── init_db.py
│   │   │   ├── __init__.py
│   │   │   └── session.py
│   │   ├── dependencies
│   │   │   ├── __init__.py
│   │   │   └── rbac.py
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models
│   │   │   ├── auction.py
│   │   │   ├── audit_log.py
│   │   │   ├── auto_bid.py
│   │   │   ├── bid.py
│   │   │   ├── category.py
│   │   │   ├── defender_log.py
│   │   │   ├── __init__.py
│   │   │   ├── notification.py
│   │   │   ├── security_incident.py
│   │   │   ├── seller_request.py
│   │   │   ├── user.py
│   │   │   └── watchlist.py
│   │   ├── schemas
│   │   │   ├── auction.py
│   │   │   ├── bid.py
│   │   │   ├── category.py
│   │   │   ├── defender.py
│   │   │   ├── __init__.py
│   │   │   ├── notification.py
│   │   │   ├── security.py
│   │   │   ├── seller_request.py
│   │   │   ├── user.py
│   │   │   └── watchlist.py
│   │   ├── services
│   │   |   ├── admin_service.py
│   │   |   ├── auction_service.py
│   │   |   ├── auth_service.py
│   │   |   ├── bid_service.py
│   │   |   ├── category_service.py
│   │   |   ├── currency_service.py
│   │   |   ├── defender_service.py
│   │   |   ├── email_service.py
│   │   |   ├── __init__.py
│   │   |   ├── logging_service.py
│   │   |   ├── notification_service.py
│   │   |   ├── otp_service.py
│   │   |   ├── role_service.py
│   │   |   ├── security_service.py
│   │   |   ├── wallet_service.py
│   │   |   ├── watchlist_service.py
│   │   |   └── websocket_manager.py
│   │   └── utils
│   │       ├── __init__.py
│   │       └── privacy.py
│   └── __init__.py
│
├── docs
│   ├── argex project Report.pdf
│   ├── Sample Screenshots
│   │   ├── admin dashboard 1.png
│   │   ├── admin dashboard 2.png
│   │   ├── admin dashboard 3.png
│   │   ├── auction page.png
│   │   ├── create account page.png
│   │   ├── create auction page.png
│   │   ├── defender dashboard.png
│   │   ├── landing page dark mode.png
│   │   ├── landing page light mode.png
│   │   ├── login page.png
│   │   ├── user profile.png
│   │   └── watchlists.png
│   └── UML Diagrams
│       ├── activity
│       │   ├── 01 argex Bidder Registration Flow.png
│       │   ├── 02 argex Seller approval process.png
│       │   ├── 03 argex Auction Creation.png
│       │   ├── 04 argex Bid Placement.png
│       │   ├── 05 argex Auto Bidding Process.png
│       │   └── 06 argex Security Incident Detection.png
│       ├── argex class.png
│       ├── argex Component.png
│       ├── argex er.png
│       ├── argex hierarchy.png
│       ├── sequence
│       │   ├── 01 argex User login process.png
│       │   ├── 02 argex Auction Creation.png
│       │   ├── 03 argex Bid Placement.png
│       │   └── 04 argex Security alert generation.png
│       └── use case
│           ├── 01 argex Authentication and Role management.png
│           ├── 02 argex Auction Interaction and Management.png
│           ├── 03 argex Bidding System.png
│           ├── 04 argex Security Monitoring System.png
│           └── 05 argex Administration System.png
│
├── frontend
│   ├── eslint.config.js
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── public
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src
│   │   ├── App.jsx
│   │   ├── components
│   │   │   ├── AuctionCard.jsx
│   │   │   ├── AutoBidPanel.jsx
│   │   │   ├── BidForm.jsx
│   │   │   ├── BidHistoryPanel.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── ConfirmModal.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── IncidentCard.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── NotificationPanel.jsx
│   │   │   ├── PasswordToggle.jsx
│   │   │   ├── ProfilePanel.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Reveal.jsx
│   │   │   ├── RiskProfilePanel.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── context
│   │   │   ├── AuthContext.jsx
│   │   │   ├── CurrencyContext.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── hooks
│   │   │   ├── useAuctionWebSocket.js
│   │   │   ├── useAuth.js
│   │   │   ├── useCurrency.js
│   │   │   ├── useTheme.js
│   │   │   └── useToast.js
│   │   ├── index.css
│   │   ├── layouts
│   │   │   ├── Layout.jsx
│   │   │   └── Navbar.jsx
│   │   ├── main.jsx
│   │   ├── pages
│   │   │   ├── AdminPanelPage.jsx
│   │   │   ├── AuctionRoomPage.jsx
│   │   │   ├── AuctionsPage.jsx
│   │   │   ├── CreateAuctionPage.jsx
│   │   │   ├── DefenderDashboardPage.jsx
│   │   │   ├── EditAuctionPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── SellerDashboardPage.jsx
│   │   │   ├── SetupPinPage.jsx
│   │   │   ├── VerifyOtpPage.jsx
│   │   │   └── WatchlistPage.jsx
│   │   ├── services
│   │   │   ├── adminService.js
│   │   │   ├── api.js
│   │   │   ├── auctionService.js
│   │   │   ├── authService.js
│   │   │   ├── bidService.js
│   │   │   ├── currencyService.js
│   │   │   ├── defenderService.js
│   │   │   ├── notificationService.js
│   │   │   ├── tokenService.js
│   │   │   └── watchlistService.js
│   │   └── utils
│   │       ├── auctionStatus.js
│   │       ├── currency.js
│   │       ├── dateTime.js
│   │       ├── privacy.js
│   │       └── roles.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── .gitignore
├── README.md
└── requirements.txt
````
---
# ⚙️ Installation & System Setup

## 1. Clone Repository

Clone the repository from GitHub:

```bash
git clone https://github.com/uptouplaksh/argex.git
cd argex
````

---

# 🐍 Backend Setup

## 2. Navigate To Backend Directory

```bash
cd backend
```

---

## 3. Create Python Virtual Environment

```bash
python -m venv venv
```

---

## 4. Activate Virtual Environment

### Linux / WSL

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

---

## 5. Install Backend Dependencies

From the project root directory:

```bash
cd ..
pip install -r requirements.txt
```

---

# 🗄️ PostgreSQL Database Setup

## 6. Create PostgreSQL Database

Open PostgreSQL console and run:

```sql
CREATE DATABASE argex_db;
```

---

## 7. Configure Environment Variables

Create `.env` file inside backend directory and configure:

```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/argex_db"

SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

LOGIN_OTP_ENABLED=true

SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

SMTP_DEV_LOG_OTP=false

BACKEND_RUN_COMMAND="uvicorn backend.app.main:app --reload"
FRONTEND_RUN_COMMAND="npm run dev"
```

---

# ⚛️ Frontend Setup

## 8. Open Separate Terminal

Navigate to frontend directory:

```bash
cd frontend
```

---

## 9. Install Frontend Dependencies

```bash
npm install
```

---

# ▶️ Running The System

# 🚀 Start Backend Server

From backend directory:

```bash
uvicorn app.main:app --reload
```

Expected terminal output:

```text
INFO:     Will watch for changes in these directories
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
INFO:     Application startup complete.
```
API Documentation available at:
```
http://127.0.0.1:8000/docs
```
---

# 🌐 Start Frontend Server

From frontend directory:

```bash
npm run dev
```

Expected terminal output:

```text
VITE vX.X.X ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

# 🔄 Usage Flow

1. User registers through the account creation system.
2. Email OTP verification validates account ownership.
3. User logs into the platform using password and security PIN.
4. Bidder browses active and upcoming auctions.
5. Users place manual bids or configure auto-bidding.
6. Sellers create and manage auctions through seller dashboard.
7. Wallet balance validation occurs before bid placement.
8. Real-time WebSocket communication synchronizes auction updates.
9. Defender monitors suspicious activities and incident logs.
10. Admin manages categories, seller approvals, and platform operations.

---

# 🔮 Future Enhancements

* AI-powered threat intelligence system
* Machine learning based fraud detection
* Predictive bidding analytics
* Mobile application development
* Cloud-native deployment architecture
* Blockchain-backed transaction validation
* Multi-language platform support
* Advanced financial analytics dashboard

---

# 📜 License

This project is released under the MIT License.

---
# 📌 Disclaimer

This project is intended for educational, research, and open-source development purposes.

---

# 🌟 Credits

ARGEX was designed and developed by @uptouplaksh as a cybersecurity-focused real-time auction intelligence platform integrating full-stack web engineering, real-time communication systems, and defensive security monitoring workflows within a unified architecture.

---

# 🤝 Contributors

| Name | Role | Status |
|---|---|---|
| @uptouplaksh | Lead Developer, System Architect & Researcher | Active |
| Open Source Contributors | Security Research, Feature Development & Testing | Open For Contributions |

---

ARGEX v1.0 • Secure Real-Time Auction Intelligence Platform

