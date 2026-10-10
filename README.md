# Wiring Diagram QC Assistant (`SpanQC`)

> **Commercial B2B SaaS for Automated Electrical & Wiring Diagram Quality Control**  
> Built for Spandsons Horizon Engineering Pvt. Ltd.

---

## Overview

**Wiring Diagram QC Assistant (`SpanQC`)** is an enterprise-grade web application designed for aerospace, industrial automation, and automotive engineering teams to automatically perform quality control on complex electrical and wiring diagrams against international standards (including **IPC/WHMA-A-620D Class 2/3**, **UL 508A**, and **ISO 7200**).

The application features a minimalist, high-precision visual design system and motion discipline inspired by modern infrastructure product design ([Spaceship.design](https://www.spaceship.design/)).

---

## Key Capabilities

1. **Deterministic Rule Verification Engine:**
   - 64 codified verification rules covering wire gauge callouts, pinout connectivity, CAN bus terminations, and high-voltage clearance.
   - Dual-engine architecture combining spatial OCR with deterministic netlist graph traversal.

2. **Sub-Millimeter Evidence Review:**
   - Split-screen diagram viewer anchored to exact schematic coordinates (e.g. Zone B3–D4, coordinates `(X:142, Y:280)`).
   - Dynamic defect bounding boxes with direct human-in-the-loop sign-off (Confirmed / Rejected / Under Review).

3. **Cryptographic Integrity:**
   - Client-side Web Crypto SHA-256 seal calculation on diagram ingestion to guarantee audit trail tamper-proofing.

4. **Multi-Format Exporting:**
   - Instant export of structured QC findings to CSV spreadsheets and printable engineering audit reports.

---

## Design System

- **Surfaces:** Cosmic Obsidian (`#06070a`, `#0c101a`, `#111726`) with 1px precision dividers (`#1b253b`).
- **Accents:** Electric Cyan (`#00f0ff`) and Precision Cobalt (`#0066ff`).
- **Typography:** Geist + JetBrains Mono (for sub-mm coordinates, pin numbers, and AWG callouts).
- **Severity Scale:** Deterministic mapping for `CRITICAL` (`#ff3366`), `MAJOR` (`#f97316`), `MINOR` (`#eab308`), `PASS` (`#10b981`), and `INFO` (`#00f0ff`).

---

## Repository Branches

- **`main`**: Production-ready codebase.
- **`testing/staging`**: Staging environment branch for integration verification and testing.

---

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Type Check & Production Build
```bash
npm run typecheck
npm run build
npm run start
```

---

## License

Proprietary © Spandsons Horizon Engineering Pvt. Ltd. All rights reserved.
