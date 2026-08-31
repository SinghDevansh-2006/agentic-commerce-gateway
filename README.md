# Agentic Commerce Gateway (ACG)

> **Autonomous AI Financial Safeguards & Policy Engine**  
> A secure, low-latency settlement coordinator and policy enforcement layer built for autonomous agent-to-agent transactions.

[![C++ Standard](https://img.shields.io/badge/C%2B%2B-20-blue.svg?style=flat-square&logo=c%2B%2B)](https://en.wikipedia.org/wiki/C%2B%2B20)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38b2ac.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg?style=flat-square)](LICENSE)

---

## 📌 The Problem Statement

As autonomous AI agents gain agency to execute real-world financial transactions—such as renting GPU clusters, buying SaaS APIs, and procuring data feeds—giving them unmediated access to credit cards or raw payment gateways creates critical vulnerabilities:

1. **Runaway Agent Loops & Overspending**: An agent stuck in a reasoning loop can drain credit lines in seconds without deterministic spending boundaries.
2. **Floating-Point Drift**: Binary floating-point math (`double`/`float`) introduces rounding drift over high-frequency micro-transactions.
3. **Ghost Inventory & Partial Failures**: If an upstream payment gateway drops or times out after inventory has been deducted, assets become desynchronized unless automatic, zero-loss rollback is guaranteed.
4. **Lack of Auditability**: Autonomous purchases require an immutable audit trail capturing exact policy evaluations, reasons for rejection, and agent identity metadata.

**ACG** solves this by inserting a high-performance, deterministic C++ policy gateway between autonomous AI agents and upstream payment rails.

---

## 🏗️ Architecture Overview

```
+-------------------------------------------------------------------------+
|                        Frontend Dashboard (SPA)                         |
|      React 18 + Vite 5 | Tailwind CSS v3 | Framer Motion v11            |
|                   Running at: http://localhost:5173                     |
+-------------------------------------------------------------------------+
                                    |
            HTTP / JSON REST API    |  CORS: Wildcard (*)
            Auto-syncs every 2.5s   |  Live Simulation POSTs
                                    v
+-------------------------------------------------------------------------+
|                      Core Policy Gateway (C++20)                        |
|        acg_gateway (CMake 3.20+) | cpp-httplib | nlohmann/json          |
|                   Listening at: http://127.0.0.1:8088                   |
+-------------------------------------------------------------------------+
         |                                |                        |
         v                                v                        v
+------------------+            +--------------------+   +-----------------+
|  Policy Engine   |            | Upstream Gateway   |   |  Audit Logger   |
|  - Spend Limits  |<---------->|  Mock Interface    |-->| - JSON payload  |
|  - Inventory Lock|            |  - HTTP 504 Timeout|   | - audit_log.json|
|  - Rollback Ctrl |            |    on every 3rd req|   +-----------------+
+------------------+            +--------------------+
         |
         v
+------------------------------------+
|  In-Memory State Repository        |
|  - std::unordered_map<ID, Agent>   |
|  - std::unordered_map<ID, Item>    |
|  - std::shared_mutex (RW locking)  |
+------------------------------------+
```

### Key Engineering Principles
- **Subunit Integer Precision**: Zero floating-point drift. All currency values are represented in fixed-point integer subunits (`1 INR = 10,000 subunits`), matching `DECIMAL(18, 4)`.
- **Atomic Rollback Lifecycle**: When an upstream gateway times out, inventory reservations are automatically restored and logged with zero fund loss.
- **Thread-Safe Concurrency**: Multi-threaded request processing utilizing `std::shared_mutex` for concurrent read queries and atomic write locks.

---

## ⚡ Tech Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Backend Engine** | C++20, CMake 3.20+ | Low-latency policy evaluation, validation, rollback |
| **HTTP Networking** | `cpp-httplib` (v0.15+) | Multi-threaded embedded REST API server |
| **JSON Serialization** | `nlohmann/json` (v3.11+) | Strict JSON request/response schema parsing |
| **Frontend Framework** | React 18, Vite 5 | Reactive operations dashboard |
| **Styling & Design** | Tailwind CSS v3 | Custom light-themed fintech design system |
| **Motion & Dynamics** | Framer Motion v11 | Layout transitions, count-up animations, tickers |
| **Icons** | Lucide React | Modern, minimalist interface iconography |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **C++ Compiler**: Clang 13+ or GCC 11+ with C++20 support
- **CMake**: Version 3.20 or newer (or compile directly using `clang++`)
- **Node.js**: Node.js 18+ and `npm`

---

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <repository-directory>
```

---

### 2. Build and Start the C++ Backend Gateway

#### Option A: Using CMake
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/acg_gateway 8088 127.0.0.1
```

#### Option B: Direct Compilation with Clang++
```bash
clang++ -std=c++20 -O3 -Iinclude \
  src/PolicyEngine.cpp \
  src/AuditLogger.cpp \
  src/HttpServer.cpp \
  src/main.cpp \
  -o acg_gateway -pthread

./acg_gateway 8088 127.0.0.1
```

*Expected output:*
```
============================================================
     Agentic Commerce Gateway (ACG) - REST API Service      
============================================================
Pre-registered Agents: agent_buyer_001 (Limit: 100000), agent_seller_002
Pre-registered Item  : item_gpu_hours (Stock: 10, Unit Price: 25000)
Starting HTTP server on http://127.0.0.1:8088 ...
[ACG HTTP Server] Listening on http://127.0.0.1:8088
```

---

### 3. Start the React Frontend Console
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

Open your browser and visit **`http://localhost:5173`**.

---

## 🧪 Interactive Testing Scenarios

From the frontend dashboard, you can trigger three live test scenarios against the C++ policy engine:

1. **Scenario A: Standard Purchase (Approved)**
   - Requests: 2 Compute Hours @ ₹2.50 = ₹5.00 (`50,000 subunits`).
   - Result: Approved, settles safely, deducts 2 units from inventory.
2. **Scenario B: Over Budget Purchase (Blocked)**
   - Requests: 5 Compute Hours @ ₹2.50 = ₹12.50 (`125,000 subunits`).
   - Result: Blocked (`Rejected: Exceeds Spending Limit`). Exceeds the ₹10.00 buyer cap. Zero funds deducted, zero inventory reserved.
3. **Scenario C: Upstream Network Drop (Auto-Recovery)**
   - Simulates an HTTP 504 Gateway Timeout on every 3rd upstream request.
   - Result: Exception caught by policy engine, reserved inventory is automatically restored, and a full rollback event is logged.

---

## 📡 REST API Reference

### `GET /health`
Liveness probe.
```json
{
  "service": "Agentic Commerce Gateway (ACG)",
  "standard": "C++20",
  "status": "healthy",
  "version": "0.1.0"
}
```

### `POST /transaction`
Executes policy evaluation, inventory lock, and upstream payment dispatch.
```json
// Request
{
  "transaction_id": "txn_8821",
  "buyer_agent_id": "agent_buyer_001",
  "seller_agent_id": "agent_seller_002",
  "item_id": "item_gpu_hours",
  "quantity": 2,
  "unit_price": 25000,
  "total_amount": 50000,
  "currency": "INR"
}

// Response (Approved)
{
  "approved": true,
  "evaluated_amount": 50000,
  "reason": "Transaction processed and settled successfully.",
  "remaining_inventory": 8,
  "status": "Approved",
  "upstream_payment_id": "pay_rzp_mock_txn_8821_1"
}
```

### `GET /logs`
Returns the historical audit trail parsed directly using `nlohmann::json`.
```json
[
  {
    "buyer_agent_id": "agent_buyer_001",
    "decision_status": "Approved",
    "rejection_reason": "",
    "requested_amount": 50000,
    "seller_agent_id": "agent_seller_002",
    "timestamp": "2026-08-31T11:31:22.597Z",
    "transaction_id": "txn_8821"
  }
]
```

---

## ⚠️ Known Limitations & Future Work

- **Database Persistence**: The data model is fully normalized in [`schema.sql`](schema.sql) (3NF), but the gateway currently operates with thread-safe in-memory maps (`std::unordered_map`). Future iterations will connect persistent PostgreSQL/SQLite storage via connection pooling.
- **Live Upstream Gateway Hooks**: Currently utilizes `RazorpayGatewayMock.hpp` to deterministically simulate upstream success and timeout failures. Future work includes live webhook verification and Razorpay Smart Collect integration.
- **Dynamic Agent Onboarding**: Support for dynamic agent registration via mTLS and cryptographic keypair signatures (`public_key` verification).

---

## 📄 License
This project is open-source and available under the [Apache-2.0 License](LICENSE).
