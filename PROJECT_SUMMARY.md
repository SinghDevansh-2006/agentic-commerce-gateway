# Technical Project Summary: Agentic Commerce Gateway (ACG)

---

## 1. Architecture Overview

The **Agentic Commerce Gateway (ACG)** is a secure, low-latency financial policy engine and settlement coordinator designed for autonomous AI agent-to-agent transactions. It enforces strict programmatic spending limits, guarantees arithmetic precision with zero floating-point drift, validates participant state, and manages atomic inventory reservation with automated rollback when upstream payment gateways fail.

```
+-------------------------------------------------------------------------+
|                         Frontend Client (SPA)                           |
|      React 18 + Vite 5 | Tailwind CSS v3 | Framer Motion v11            |
|                   Running at: http://localhost:5173                     |
+-------------------------------------------------------------------------+
                                    |
          HTTP / JSON REST API      |  CORS: Wildcard (*)
          Polling every 2.5s        |  Preflight: OPTIONS 204
                                    v
+-------------------------------------------------------------------------+
|                        Backend Service (C++20)                          |
|         acg_gateway (CMake 3.20+) | cpp-httplib | nlohmann/json          |
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

### Communication Details
- **Protocol**: HTTP/1.1 REST over TCP, exchanging JSON payloads.
- **Backend Service**: Native C++20 binary (`acg_gateway`), listening by default on `127.0.0.1:8088` (or custom host/port passed via CLI arguments).
- **Frontend Service**: React single-page application served via Vite development server on `http://localhost:5173`.
- **CORS Handling**: `HttpServer.cpp` configures pre-routing headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD`, `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With`) and returns HTTP 204 on `OPTIONS` preflight requests.

---

## 2. Backend Technical Details

### 2.1 API Endpoints

#### 1. `GET /health`
- **Purpose**: Liveness and readiness probe for the HTTP service.
- **Request**: No parameters or body.
- **Response**: `200 OK`
  ```json
  {
    "service": "Agentic Commerce Gateway (ACG)",
    "standard": "C++20",
    "status": "healthy",
    "version": "0.1.0"
  }
  ```

#### 2. `POST /transaction`
- **Purpose**: Ingests, evaluates, locks inventory for, and attempts settlement of an agent purchase request.
- **Request Body**: `application/json`
  ```json
  {
    "transaction_id": "txn_6421",
    "buyer_agent_id": "agent_buyer_001",
    "seller_agent_id": "agent_seller_002",
    "item_id": "item_gpu_hours",
    "quantity": 2,
    "unit_price": 25000,
    "total_amount": 50000,
    "currency": "INR"
  }
  ```
- **Response Payload**: `200 OK` (Structured decision object)
  ```json
  {
    "approved": true,
    "evaluated_amount": 50000,
    "reason": "Transaction processed and settled successfully.",
    "remaining_inventory": 8,
    "status": "Approved",
    "upstream_payment_id": "pay_rzp_mock_txn_6421_1"
  }
  ```
  *On Rejection (e.g. spending limit exceeded)*:
  ```json
  {
    "approved": false,
    "evaluated_amount": 125000,
    "reason": "Transaction total (125000) exceeds buyer spending limit (100000).",
    "remaining_inventory": 10,
    "status": "Rejected: Exceeds Spending Limit",
    "upstream_payment_id": ""
  }
  ```
  *On Upstream Timeout (simulated HTTP 504 on every 3rd call)*:
  ```json
  {
    "approved": false,
    "evaluated_amount": 50000,
    "reason": "Upstream failure caught: Razorpay upstream gateway timeout: HTTP 504 Gateway Timeout on request #3 for txn txn_6421. Inventory reservation rolled back successfully.",
    "remaining_inventory": 10,
    "status": "Rejected: Upstream Gateway Timeout",
    "upstream_payment_id": ""
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Malformed JSON or missing required fields (`transaction_id`, `buyer_agent_id`, `seller_agent_id`, `item_id`).
  - `404 Not Found`: Buyer agent, seller agent, or inventory item not registered in memory.

#### 3. `GET /logs`
- **Purpose**: Reads all audit log entries written to disk.
- **Request**: No parameters.
- **Response**: `200 OK` (JSON array of historical audit entries, newest to oldest depending on client ordering)
  ```json
  [
    {
      "buyer_agent_id": "agent_buyer_001",
      "decision_status": "Approved",
      "rejection_reason": "Transaction processed and settled successfully.",
      "requested_amount": 50000,
      "seller_agent_id": "agent_seller_002",
      "timestamp": "2026-08-31T10:45:12Z",
      "transaction_id": "txn_6421"
    }
  ]
  ```

---

### 2.2 Financial Mathematics & Subunit Precision

Floating-point data types (`float`, `double`) are strictly prohibited in the core financial models (`Types.hpp`). Binary floating-point representation introduces cumulative rounding drift and representation errors (e.g., `0.1 + 0.2 != 0.3`).

- **Integer Currency Representation**: Monetary values use `using MoneyAmount = int64_t`.
- **Subunit Multiplier**: `1 INR = 10,000 subunits` (micro-INR), corresponding to the database specification `DECIMAL(18, 4)` defined in `schema.sql`.
  - ₹2.50 = `25,000` subunits.
  - ₹10.00 (Buyer limit) = `100,000` subunits.
  - ₹500.00 (Seller limit) = `5,000,000` subunits.
- **Overflow Protection**: The policy engine validates integer multiplication boundaries against `std::numeric_limits<MoneyAmount>::max()` before arithmetic operations:
  ```cpp
  if (request.quantity > 0 && 
      request.unit_price > std::numeric_limits<MoneyAmount>::max() / request.quantity) {
      // Reject with PolicyStatus::RejectedArithmeticOverflow
  }
  ```

---

### 2.3 Policy Engine Validation Logic

When a transaction request enters `PolicyEngine::evaluate` / `evaluate_detailed`, the following sequential checks are executed:

1. **Buyer Account Active Check**: Verifies `buyer.is_active == true`. Fails with `RejectedInactiveAgent`.
2. **Currency Consistency Check**: Verifies `buyer.currency == request.currency`. Fails with `RejectedCurrencyMismatch`.
3. **Value Positivity Check**: Verifies `quantity > 0`, `unit_price > 0`, and `total_amount > 0`. Fails with `RejectedInvalidAmount`.
4. **Arithmetic Consistency Check**: Recomputes `computed_total = quantity * unit_price` with overflow bounds checking. If `computed_total != request.total_amount`, rejects with `RejectedInvalidAmount`.
5. **Self-Transaction Prevention**: Verifies `buyer.agent_id != seller.agent_id`. Fails with `RejectedSelfTransaction`.
6. **Seller Account Active Check**: Verifies `seller.is_active == true`. Fails with `RejectedInactiveAgent`.
7. **Per-Transaction Spending Limit Check**: Verifies `request.total_amount <= buyer.max_spending_limit`. Fails with `RejectedExceedsLimit`.
8. **Cumulative Spend Check**: If tracking running cumulative spend, verifies `current_cumulative_spend + total_amount <= buyer.max_spending_limit` with overflow guards.

---

### 2.4 Inventory Lock and Rollback Mechanism (Step-by-Step Implementation)

The atomic transaction lifecycle is implemented inside `PolicyEngine::process_transaction` (`src/PolicyEngine.cpp`):

```
[Request Arrives]
       |
       v
1. Lock State Repository  ---> std::unique_lock<std::shared_mutex> (Exclusive Write Lock)
       |
       v
2. Policy Evaluation     ---> Checks limits, currencies, active flags
       |                      (If rejected: write audit log and return immediately)
       v
3. Inventory Check       ---> Does item.stock_quantity >= request.quantity?
       |                      (If false: return RejectedInsufficientInventory)
       v
4. Inventory Reservation ---> inventory.stock_quantity -= request.quantity;
       |
       v
5. Upstream Dispatch     ---> gateway.process_payment(request)
       |
       +----------------------------+
       |                            |
  [Success]                    [Exception Caught]
       |                            |
       v                            v
6a. Finalize Settlement      6b. Rollback Inventory
    - status = Approved          - inventory.stock_quantity += request.quantity;
    - attach payment_id          - status = RejectedUpstreamTimeout
       |                            |
       +----------------------------+
       |
       v
7. Write Structured Audit Log ---> AuditLogger::log_decision() to audit_log.json
       |
       v
8. Release Mutex & Return Decision
```

- **Thread-Safety**: The HTTP route handler obtains a `std::unique_lock<std::shared_mutex>` on `m_state_mutex` before modifying `m_inventory` or calling `process_transaction`. Read-only operations (`get_agent`, `get_inventory_item`) acquire a `std::shared_lock`.
- **Atomic Rollback**: If `gateway.process_payment` throws a `GatewayTimeoutException` (or standard `std::exception`), the catch block restores the reserved units (`inventory.stock_quantity += request.quantity`), changes the decision status to `PolicyStatus::RejectedUpstreamTimeout`, and persists the rollback event to the audit trail.

---

## 3. Frontend Technical Details

### 3.1 Views and Sections

The client is a React 18 single-page application governed by an internal state machine (`appState`: `'loading'` $\rightarrow$ `'landing'` $\rightarrow$ `'dashboard'`):

1. **Loading / Splash Screen (`LoadingScreen.jsx`)**:
   - Wordmark display: "Agentic Commerce Gateway".
   - Shimmer sweep effect across the icon container.
   - Smooth 2-second progress bar animation, auto-transitioning to the landing page with an 800ms fade-out.
2. **Landing Hero Section (`LandingHero.jsx`)**:
   - Asymmetric layout with Space Grotesk headline: "Autonomous AI Financial Safeguards & Policy Engine".
   - Animated lime underline on headline.
   - Panning SVG background node grid (opacity 4%).
   - 3 feature cards with the primary card ("Spending Limits") styled with lime accent.
   - "Launch Dashboard" button with scale and shadow-lift micro-interactions.
3. **Dashboard View (`App.jsx`)**:
   - **Sidebar Navigation (`Sidebar.jsx`)**: Left panel (256px wide). Provides smooth-scroll navigation to `#dashboard-overview`, `#dashboard-agents`, `#dashboard-policies`, and `#dashboard-activity`. Includes an automated scrollspy listener syncing the active lime indicator to the user's scroll position.
   - **Topbar / Navbar (`Navbar.jsx`)**:
     - Global search bar indexing registered agents, active policy rules, and recent transaction IDs. Shows instant dropdown results with keyboard shortcut `/` to focus and `Escape` to close.
     - Live sync indicator showing connection state and polling frequency, with a manual refresh trigger.
     - Notifications drawer with an active unread count badge, click-outside dismissal, explicit dismiss button (`X`) per notification, and click-to-scroll-to-transaction behavior.
     - Security Admin profile panel displaying node ID (`acg-core-node-01` with copy-to-clipboard), memory latency, uptime, and engine core specs.
   - **Stat Cards Row (`StatsOverview.jsx`)**:
     - Displays 4 metrics: Total Purchases, Approved & Settled, Over-Budget Blocked, and Network Errors Recovered.
     - Over-Budget Blocked is highlighted with the lime design theme.
     - Includes a `CountUpNumber` micro-animation running via `requestAnimationFrame` with cubic easing.
   - **Agents & Policies Section (`AgentCatalog.jsx`)**:
     - Registered agent participants: AI Procurement Agent, AI Cloud Vendor, GPU Compute Inventory.
     - Active Policy Guardrails: Hard Spending Limit (₹10.00), Micro-INR Precision (10,000 subunits/INR), and Zero-Loss Timeout Rollback.
   - **Simulation Workspace (`TriggerForm.jsx`)**:
     - 3 quick-test scenario cards: Standard (₹5.00), Over Budget (₹12.50), and Network Drop (Mock 504).
     - Scenario cards trigger a visual color pulse (emerald/amber/rose) across the form card upon selection.
     - Fully editable Compute (Hours) numeric input with live-updating total and vertical ticker animation (`AnimatePresence mode="wait"`).
     - Direct `POST /transaction` submission with loading state.
   - **Live Activity Feed (`TransactionFeed.jsx` + `TransactionItem.jsx`)**:
     - Real-time search filter supporting partial and status keywords ("blocked", "recovered", "settled", "approved", "timeout").
     - Multi-row filter tabs (All Activity, Approved, Over Budget, Recovered) with spring-sliding pill animation (`layoutId="activeFeedFilter"`).
     - Single-direction slide-down entrance animation on new rows with a brief status-colored highlight flash (emerald for Approved, amber for Blocked, rose for Recovered).
     - Collapsible Technical Details Drawer per row revealing formatted JSON audit records.
   - **Footer**: System health and C++20 zero-loss memory status.

---

### 3.2 Live State vs. Mocked State

| Feature / Data Point | Real (Live-Fetched) | Mocked / Static | Notes |
| :--- | :---: | :---: | :--- |
| **Transaction Feed** | ✅ | | Pulled live from `GET /logs` every 2.5s. |
| **Stat Cards Counters** | ✅ | | Calculated dynamically by aggregating the live `logs` array. |
| **Transaction Execution** | ✅ | | Dispatched live via `POST /transaction` to the C++ HTTP server. |
| **Backend Online Indicator** | ✅ | | Probed via `GET /health` every 2.5s. |
| **Upstream Payment Settlement** | | ⚠️ | Handled by C++ `RazorpayGatewayMock` (throws 504 on every 3rd request). |
| **Registered Agents Catalog** | | ⚠️ | Hardcoded in `AgentCatalog.jsx` and initialized in `main.cpp`. |
| **System Notifications** | | ⚠️ | Pre-seeded with 4 mock alerts, but wired to locate live feed rows on click. |
| **Security Admin Profile** | | ⚠️ | Hardcoded node telemetry (`acg-core-node-01`, `< 2ms`). |

---

### 3.3 Polling & Re-Fetch Triggers

- **Background Polling**: An interval timer executes `fetchLogs()` every **2,500 ms (2.5 seconds)** whenever `appState === 'dashboard'`.
- **Immediate Event-Driven Triggers**:
  - Clicking the **Sync** button in the topbar triggers an immediate manual re-fetch.
  - Submitting a purchase via **Execute Transaction** dispatches `POST /transaction`, awaits the response, and immediately triggers `await fetchLogs()` without waiting for the 2.5s interval to elapse.

---

### 3.4 Animation Stack & Implementation

- **Library**: `framer-motion` (v11.18.27).
- **Tailwind CSS**: Custom color tokens (`spark-bg`, `spark-forestDark`, `spark-lime`, `spark-textMain`, `spark-borderLight`), custom grid patterns, and typography classes.
- **Animation Details**:
  - **Shared Layouts**: `layoutId="activeIndicator"` for the sidebar active item; `layoutId="activeFeedFilter"` for the feed filter tabs.
  - **Stagger Transitions**: Notifications panel items enter with `delay: index * 0.05s`.
  - **Single-Direction Feed Entrance**: Parent container uses `y: -16 -> 0` with cubic bezier `[0.16, 1, 0.3, 1]` for 350ms, while sibling rows adjust via `layout="position"`.
  - **Background Flash**: New or inspected rows animate `backgroundColor` from translucent status color to default background over 1.2s ease-out.
  - **Drawer Height Animation**: Collapsible drawers animate `height: 0 -> 'auto'` and `opacity: 0 -> 1` inside `AnimatePresence`.

---

## 4. Known Limitations & Incomplete Features

To ensure an accurate technical assessment, the following simplifications and gaps are documented:

1. **In-Memory Volatile State**:
   - `HttpServer` stores agents and inventory in `std::unordered_map` instances protected by `std::shared_mutex`.
   - While `schema.sql` defines a 3NF relational schema (tables: `Authorized_Agents`, `Inventory`, `Transaction_Logs`), no actual database driver (such as PostgreSQL `libpq` or SQLite3) is currently linked to the binary. All state is reset to the defaults defined in `main.cpp` upon process termination.
2. **Mock Upstream Payment Gateway**:
   - The upstream gateway (`RazorpayGatewayMock.hpp`) uses an in-memory `std::atomic<uint64_t>` request counter and deterministically throws a `GatewayTimeoutException` when `count % 3 == 0`. It does not make real network calls to Razorpay APIs or verify webhook signatures.
3. **Hardcoded Participant Set**:
   - Only three entities exist in the backend at startup (`agent_buyer_001`, `agent_seller_002`, `item_gpu_hours`). There are no REST API endpoints for agent registration (`POST /agents`) or inventory creation (`POST /inventory`).
4. **Audit Log File Parsing & Concurrency**:
   - The backend `GET /logs` endpoint parses `audit_log.json` using `nlohmann::json` on the trimmed array payload with a per-record fallback. While memory-efficient for moderate scale, high-throughput production environments would stream append-only logs to an external database (e.g. PostgreSQL) rather than re-reading a flat file on every poll.
5. **Static Client Telemetry**:
   - The Security Admin drawer in the navbar displays static metadata (`acg-core-node-01`, uptime 99.99%) rather than querying live server resource telemetry.
   - Notifications in `Navbar.jsx` are pre-seeded client-side rather than streamed over WebSockets or Server-Sent Events (SSE).

---

## 5. Repository File Structure

```
.
├── CMakeLists.txt              # CMake build configuration (enforces C++20, builds acg_core & acg_gateway)
├── schema.sql                  # 3NF relational schema for Agents, Inventory, and Transaction Logs
├── audit_log.json              # Disk-persisted JSON audit ledger generated by AuditLogger
├── include/
│   ├── httplib.h               # cpp-httplib v0.15.3 (header-only HTTP/HTTPS server and client)
│   ├── nlohmann/
│   │   └── json.hpp            # nlohmann/json v3.11.3 (header-only C++ JSON serialization library)
│   └── acg/
│       ├── Types.hpp           # Core domain types (MoneyAmount, Agent, InventoryItem, PolicyDecision)
│       ├── PolicyEngine.hpp    # Class declaration for PolicyEngine and policy rule validators
│       ├── RazorpayGatewayMock.hpp # Upstream gateway interface and mock implementation with 504 timeout simulation
│       ├── AuditLogger.hpp     # Thread-safe audit logger writing JSON records to stdout and disk
│       └── HttpServer.hpp      # REST API server wrapper exposing /health, /transaction, and /logs
├── src/
│   ├── PolicyEngine.cpp        # Implementation of policy validation, inventory lock, and exception rollback
│   ├── AuditLogger.cpp         # Implementation of JSON serialization and audit file persistence
│   ├── HttpServer.cpp          # HTTP route handlers, request validation, CORS, and JSON response assembly
│   └── main.cpp                # Service entry point: bootstrap state, signal handlers, port binding
└── frontend/                   # React 18 + Vite 5 frontend project
    ├── package.json            # Node.js dependencies and build scripts
    ├── vite.config.js          # Vite build and development configuration
    ├── tailwind.config.js      # Tailwind CSS configuration with spark design system colors
    ├── index.html              # HTML entry point with Space Grotesk and Inter font imports
    └── src/
        ├── main.jsx            # React root component initialization
        ├── App.jsx             # Top-level state coordinator, polling loop, and scrollspy listener
        ├── index.css           # Global Tailwind directives and custom scrollbars
        ├── services/
        │   └── api.js          # REST client wrapper for /health, /transaction, and /logs
        └── components/
            ├── LoadingScreen.jsx   # Animated splash/loading screen
            ├── LandingHero.jsx     # Asymmetric hero section with feature cards and launch CTA
            ├── Sidebar.jsx         # Left navigation panel with scrollspy active indicators
            ├── Navbar.jsx          # Topbar with live search, notification modal, and profile panel
            ├── StatsOverview.jsx   # 4 metric cards with count-up number animations
            ├── AgentCatalog.jsx    # Registered agent cards and active policy guardrails
            ├── TriggerForm.jsx     # Scenario triggers, editable compute input, and submit action
            ├── TransactionFeed.jsx # Live activity stream with multi-keyword filtering
            └── TransactionItem.jsx # Individual feed row with color flash and collapsible audit drawer
```

---

## 6. How to Build and Run Locally

### Prerequisites
- **C++ Compiler**: Clang 13+ or GCC 11+ with C++20 support.
- **Build System**: CMake 3.20 or newer.
- **Node.js**: Node.js v18.0.0 or higher and `npm`.

---

### 6.1 Running the Backend Service

1. Open a terminal in the project root directory:
   ```bash
   cd <project-root> # or cd ./
   ```

2. Generate build files and compile the executable:
   ```bash
   cmake -B build -DCMAKE_BUILD_TYPE=Release
   cmake --build build -j
   # Or compile directly using clang++:
   # clang++ -std=c++20 -O3 -Iinclude src/PolicyEngine.cpp src/AuditLogger.cpp src/HttpServer.cpp src/main.cpp -o acg_gateway -pthread
   ```

3. Launch the ACG gateway server on port `8088`:
   ```bash
   ./build/acg_gateway 8088 127.0.0.1
   # Or run direct binary: ./acg_gateway 8088 127.0.0.1
   ```
   *Expected Terminal Output*:
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

### 6.2 Running the Frontend Client

1. Open a second terminal window and navigate to the `frontend` folder:
   ```bash
   cd ./frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Expected Terminal Output*:
   ```
     VITE v5.4.21  ready in 240 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
   ```

4. Open your browser and navigate to **[http://localhost:5173](http://localhost:5173)**.
   - The animated loading screen will display for ~2 seconds.
   - Click **"Launch Dashboard"** on the landing page to enter the live operations console.
   - Click any of the three simulation buttons (**Standard**, **Over Budget**, or **Network Drop**) to observe live policy validation, inventory decrement, automated rollback, and real-time feed updates.
