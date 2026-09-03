#pragma once

#include "PolicyEngine.hpp"
#include "RazorpayGatewayMock.hpp"
#include "AuditLogger.hpp"
#include "Types.hpp"
#include <string>
#include <memory>
#include <optional>
#include <unordered_map>
#include <shared_mutex>

namespace httplib {
    class Server;
}

namespace acg {

class HttpServer {
public:
    HttpServer(
        std::shared_ptr<PolicyEngine> engine,
        std::shared_ptr<RazorpayGatewayMock> gateway,
        std::shared_ptr<AuditLogger> logger,
        std::string audit_log_path = "audit_log.json"
    );
    ~HttpServer();

    /// Registers an agent into the in-memory state repository.
    void register_agent(const Agent& agent);

    /// Registers or updates an inventory item.
    void register_inventory_item(const InventoryItem& item);

    /// Retrieves an agent by ID (thread-safe).
    [[nodiscard]] std::optional<Agent> get_agent(const std::string& agent_id) const;

    /// Retrieves an inventory item by ID (thread-safe).
    [[nodiscard]] std::optional<InventoryItem> get_inventory_item(const std::string& item_id) const;

    /// Starts the blocking HTTP server on host and port.
    bool listen(const std::string& host, int port);

    /// Stops the running HTTP server.
    void stop();

private:
    void setup_routes();
    void set_cors_headers(httplib::Server& svr);

    std::shared_ptr<PolicyEngine> m_engine;
    std::shared_ptr<RazorpayGatewayMock> m_gateway;
    std::shared_ptr<AuditLogger> m_logger;
    std::string m_audit_log_path;

    std::unique_ptr<httplib::Server> m_server;

    // In-memory state storage with read-write mutex protection
    std::unordered_map<std::string, Agent> m_agents;
    std::unordered_map<std::string, InventoryItem> m_inventory;
    mutable std::shared_mutex m_state_mutex;
};

} // namespace acg
