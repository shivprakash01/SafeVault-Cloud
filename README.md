# 🔐 SafeVault Cloud

**Microservices-Based Cloud Backup Platform — 3 Services, 3 Ports, 3 Web Pages**

![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)
![React](https://img.shields.io/badge/Frontend-React_Port_3000-61DAFB?logo=react)
![Flask](https://img.shields.io/badge/Upload_Service-Flask_Port_5000-000000?logo=flask)
![Node](https://img.shields.io/badge/Auth_Service-Node.js_Port_8000-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)
![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?logo=redis)
![CI/CD](https://img.shields.io/badge/CI/CD-GitHub_Actions-2088FF?logo=github-actions)

---

## 🖥️ Open 3 Browser Tabs After Starting

| Browser URL | Service | Technology | Purpose |
|---|---|---|---|
| **http://localhost:3000** | Frontend | React + Nginx | Full dashboard — login, upload, manage files |
| **http://localhost:8000** | Auth Service | Node.js + Express | Register/login UI + JWT API |
| **http://localhost:5000** | Upload Service | Python Flask | File upload/download UI + REST API |

---

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/SafeVault-Cloud.git
cd SafeVault-Cloud
docker-compose up --build
```

Then open **3 tabs** in your browser:
- `http://localhost:3000` → Main App
- `http://localhost:8000` → Auth Microservice
- `http://localhost:5000` → Upload Microservice

---

## 🏗️ Architecture

```
Browser Tab 1          Browser Tab 2         Browser Tab 3
localhost:3000         localhost:8000        localhost:5000
     │                      │                     │
     ▼                      ▼                     ▼
┌──────────┐         ┌──────────┐          ┌──────────────┐
│ Frontend │         │  Auth    │          │   Upload     │
│  React   │────────►│ Service  │◄─────────│   Service    │
│  +Nginx  │         │ Node.js  │          │   Python     │
└──────────┘         └────┬─────┘          └──────┬───────┘
                          │                        │
                     ┌────▼────────────────────────▼────┐
                     │              MongoDB              │
                     │         (User + File Data)        │
                     └──────────────┬───────────────────┘
                                    │
                     ┌──────────────▼───────────────────┐
                     │               Redis               │
                     │         (Session Cache)           │
                     └──────────────────────────────────┘
```

---

## 📁 Project Structure

```
SafeVault-Cloud/
├── frontend/                  ← Microservice 1 (Port 3000)
│   ├── src/
│   │   ├── App.js / App.css
│   │   ├── context/AuthContext.js
│   │   ├── pages/Login.js
│   │   ├── pages/Register.js
│   │   └── pages/Dashboard.js
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
│
├── auth-service/              ← Microservice 2 (Port 8000)
│   ├── index.js               ← Serves web page + JWT API
│   ├── package.json
│   └── Dockerfile
│
├── upload-service/            ← Microservice 3 (Port 5000)
│   ├── app.py                 ← Serves web page + File API
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml         ← Runs all 5 containers
├── .github/workflows/ci.yml   ← GitHub Actions CI/CD
└── README.md
```

---

## 🔌 API Reference

### Auth Service — http://localhost:8000
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | **Web page UI** |
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/auth/verify` | Verify token |
| POST | `/api/auth/logout` | Clear session |

### Upload Service — http://localhost:5000
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | **Web page UI** |
| GET | `/health` | Health check |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files` | List files |
| GET | `/api/files/download/<id>` | Download file |
| DELETE | `/api/files/delete/<id>` | Soft delete |
| PATCH | `/api/files/restore/<id>` | Restore |
| DELETE | `/api/files/permanent/<id>` | Permanent delete |
| GET | `/api/files/stats` | Storage stats |

---

## ⚙️ CI/CD Pipeline

```
git push → GitHub Actions triggers automatically
    ↓
Job 1: Test   → Node.js lint + Python syntax check
    ↓
Job 2: Build  → Build all 3 Docker images
    ↓
Job 3: Integration → docker-compose up → health check all 3 ports → down
    ↓
Job 4: Push   → Push to Docker Hub (main branch only)
```

---

## ☁️ Future AWS Deployment

| Local | AWS |
|---|---|
| mongo container | MongoDB Atlas / Amazon DocumentDB |
| redis container | Amazon ElastiCache |
| uploads/ folder | Amazon S3 |
| Docker containers | Amazon ECS Fargate |
| docker-compose | AWS Elastic Beanstalk |
| Nginx | Amazon CloudFront + ALB |
| localhost VM | Amazon EC2 |
