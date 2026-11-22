# SPANQC Enterprise — Vendor & Private Cloud Deployment Guide

This document describes how to deploy and operate the **SPANQC Enterprise Wiring Diagram Quality Control Platform** in a vendor-hosted private environment or cloud provider (AWS / Azure).

---

## 1. System Architecture

The application is packaged into containerized services:

```
                  ┌──────────────────────────────────────────────┐
                  │          Vendor Ingress / Port 80, 443       │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌────────────────────────────────────────────────┐
                 │       spanqc-web (Next.js 16 Web App)          │
                 │   - Authenticated Enterprise Sign-in Portal    │
                 │   - Unbox™ & Schematic Upload Pipeline         │
                 │   - Deterministic Job Orchestrator & Reports   │
                 └───────┬───────────────────────────────┬────────┘
                         │                               │
        Internal RPC     │                               │  ORM
        Port 8000        ▼                               ▼  Port 5432
  ┌──────────────────────────────┐              ┌────────────────────────┐
  │ spanqc-core (Python FastAPI) │              │ PostgreSQL Database    │
  │ - IPC/WHMA-A-620 Rules Engine│              │ - Users, Roles & Teams │
  │ - Vision Multi-Modal Parser  │              │ - Jobs & Audit Trails  │
  │ - Netlist Comparison Engine  │              │ - Reference Standards  │
  └──────────────────────────────┘              └────────────────────────┘
```

---

## 2. Information & Credentials to Request From the Vendor

Depending on where the vendor intends to run the application, request the following:

### A. If Running On Vendor's Server (On-Premises / Private Linux VM)
1. **Server Access**: IP address and SSH credentials (or a designated engineer on their team to run Docker commands).
2. **Domain / Hostname**: The internal or public URL they plan to use (e.g. `https://qc.vendor.internal`).
3. **AI Vision API Key**: `ANTHROPIC_API_KEY` (Anthropic Claude API key) or internal Azure OpenAI / AWS Bedrock credentials for schematic vision transcription.
4. **Firewall / Network**: Inbound access to Port **80** (HTTP) and/or **443** (HTTPS).

### B. If Running On AWS (Amazon Web Services)
1. **AWS Region**: e.g., `us-east-1` or `eu-west-1`.
2. **Option 1 (Simple EC2)**: Ubuntu 22.04 / 24.04 EC2 instance (`t3.medium` or `t3.large`, 4GB+ RAM, 30GB SSD).
3. **Option 2 (Managed Services)**:
   - AWS RDS PostgreSQL database connection URL (`DATABASE_URL`).
   - AWS S3 Bucket Name for schematic file storage (`AWS_S3_BUCKET`).
   - IAM credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) with S3 and Bedrock permissions.

### C. If Running On Microsoft Azure
1. **Azure Region**: e.g., `eastus` or `westeurope`.
2. **Option 1 (Azure VM)**: Standard Ubuntu Linux VM (`Standard_B2s` or `Standard_D2s_v5`).
3. **Option 2 (Container Apps)**:
   - Azure Database for PostgreSQL flexible server connection URL (`DATABASE_URL`).
   - Azure Blob Storage connection string (`AZURE_STORAGE_CONNECTION_STRING`).
   - Azure OpenAI endpoint and API key (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`).

---

## 3. Quickstart: 1-Command Deployment (Docker Compose)

### Prerequisites on Target Host
- Docker Engine (v24.0+)
- Docker Compose (v2.20+)

### Step 1: Clone or Copy Repository
```bash
git clone https://github.com/Adhavan07/Spanqc.git
cd Spanqc
```

### Step 2: Configure Environment
Copy the vendor template:
```bash
cp .env.vendor.example .env
```
Open `.env` and set:
- `AUTH_SECRET`: Generate a random 32-byte key:
  ```bash
  openssl rand -hex 32
  ```
- `ANTHROPIC_API_KEY`: Enter the Claude vision API key.
- `NEXTAUTH_URL`: Enter the vendor's hostname (e.g., `http://<SERVER_IP>` or `https://qc.company.com`).

### Step 3: Launch Containers
```bash
docker compose up -d --build
```

### Step 4: Verify Deployment
Check running services:
```bash
docker compose ps
```
Both `spanqc-web`, `spanqc-core`, and `spanqc-db` will be active.

Access the application in any browser:
```
http://<SERVER_IP_OR_DOMAIN>/
```
The application will immediately display the secure **Enterprise Sign-In Portal**.

---

## 4. Maintenance & Operations

### View Live Logs
```bash
# Web application logs
docker compose logs -f web

# Python core microservice logs
docker compose logs -f core
```

### Restart / Update
```bash
docker compose down
docker compose pull
docker compose up -d
```

### Data Backup
All data is stored in Docker persistent volumes:
- `spanqc_pgdata`: PostgreSQL database tables and inspection history.
- `spanqc_prod_storage`: Uploaded schematic files and output packages.

To back up the PostgreSQL database:
```bash
docker compose exec -T db pg_dump -U spanqc spanqc_prod > spanqc_backup_$(date +%F).sql
```
