#include "acg/HttpServer.hpp"
#include "httplib.h"
#include "nlohmann/json.hpp"
#include <iostream>
#include <fstream>
#include <sstream>

using json = nlohmann::json;

namespace acg {

HttpServer::HttpServer(
    std::shared_ptr<PolicyEngine> engine,
    std::shared_ptr<RazorpayGatewayMock> gateway,
    std::shared_ptr<AuditLogger> logger,
    std::string audit_log_path
) : m_engine(std::move(engine)),
    m_gateway(std::move(gateway)),
    m_logger(std::move(logger)),
    m_audit_log_path(std::move(audit_log_path)),
    m_server(std::make_unique<httplib::Server>()) {
    setup_routes();
}

HttpServer::~HttpServer() {
    stop();
}

void HttpServer::register_agent(const Agent& agent) {
    std::unique_lock<std::shared_mutex> lock(m_state_mutex);
    m_agents[agent.agent_id] = agent;
}

void HttpServer::register_inventory_item(const InventoryItem& item) {
    std::unique_lock<std::shared_mutex> lock(m_state_mutex);
    m_inventory[item.item_id] = item;
}

std::optional<Agent> HttpServer::get_agent(const std::string& agent_id) const {
    std::shared_lock<std::shared_mutex> lock(m_state_mutex);
    auto it = m_agents.find(agent_id);
    if (it != m_agents.end()) {
        return it->second;
    }
    return std::nullopt;
}

std::optional<InventoryItem> HttpServer::get_inventory_item(const std::string& item_id) const {
    std::shared_lock<std::shared_mutex> lock(m_state_mutex);
    auto it = m_inventory.find(item_id);
    if (it != m_inventory.end()) {
        return it->second;
    }
    return std::nullopt;
}

void HttpServer::set_cors_headers(httplib::Server& svr) {
    svr.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        if (req.method == "OPTIONS") {
            res.status = 204;
            return httplib::Server::HandlerResponse::Handled;
        }
        return httplib::Server::HandlerResponse::Unhandled;
    });
}

void HttpServer::setup_routes() {
    set_cors_headers(*m_server);

    // 1. Health & Status Probe
    m_server->Get("/health", [](const httplib::Request&, httplib::Response& res) {
        json response = {
            {"status", "healthy"},
            {"service", "Agentic Commerce Gateway (ACG)"},
            {"version", "0.1.0"},
            {"standard", "C++20"}
        };
        res.set_content(response.dump(2), "application/json");
    });

    // 2. POST /transaction Endpoint
    m_server->Post("/transaction", [this](const httplib::Request& req, httplib::Response& res) {
        json body;
        try {
            body = json::parse(req.body);
        } catch (const json::parse_error& e) {
            json err = {
                {"error", "Invalid JSON payload"},
                {"details", e.what()}
            };
            res.status = 400;
            res.set_content(err.dump(2), "application/json");
            return;
        }

        // Parse TransactionRequest fields with validation
        TransactionRequest txn_req;
        try {
            txn_req.transaction_id = body.value("transaction_id", "");
            txn_req.buyer_agent_id = body.value("buyer_agent_id", "");
            txn_req.seller_agent_id = body.value("seller_agent_id", "");
            txn_req.item_id = body.value("item_id", "");
            txn_req.quantity = body.value("quantity", 1);
            txn_req.unit_price = body.value("unit_price", int64_t(0));
            txn_req.total_amount = body.value("total_amount", int64_t(0));
            txn_req.currency = body.value("currency", "INR");

            if (txn_req.transaction_id.empty() || 
                txn_req.buyer_agent_id.empty() || 
                txn_req.seller_agent_id.empty() || 
                txn_req.item_id.empty()) {
                json err = {
                    {"error", "Missing required fields: transaction_id, buyer_agent_id, seller_agent_id, item_id"}
                };
                res.status = 400;
                res.set_content(err.dump(2), "application/json");
                return;
            }
        } catch (const std::exception& e) {
            json err = {
                {"error", "Malformed request schema"},
                {"details", e.what()}
            };
            res.status = 400;
            res.set_content(err.dump(2), "application/json");
            return;
        }

        // Retrieve Entities from state store under write lock for inventory consistency
        std::unique_lock<std::shared_mutex> lock(m_state_mutex);
        
        auto buyer_it = m_agents.find(txn_req.buyer_agent_id);
        if (buyer_it == m_agents.end()) {
            json err = {
                {"status", "Rejected: Agent Not Found"},
                {"approved", false},
                {"reason", "Buyer agent " + txn_req.buyer_agent_id + " is not registered in ACG."}
            };
            res.status = 404;
            res.set_content(err.dump(2), "application/json");
            return;
        }

        auto seller_it = m_agents.find(txn_req.seller_agent_id);
        if (seller_it == m_agents.end()) {
            json err = {
                {"status", "Rejected: Agent Not Found"},
                {"approved", false},
                {"reason", "Seller agent " + txn_req.seller_agent_id + " is not registered in ACG."}
            };
            res.status = 404;
            res.set_content(err.dump(2), "application/json");
            return;
        }

        auto item_it = m_inventory.find(txn_req.item_id);
        if (item_it == m_inventory.end()) {
            json err = {
                {"status", "Rejected: Item Not Found"},
                {"approved", false},
                {"reason", "Inventory item " + txn_req.item_id + " does not exist."}
            };
            res.status = 404;
            res.set_content(err.dump(2), "application/json");
            return;
        }

        // Execute Policy Engine Lifecycle with Upstream Gateway & Inventory rollback
        PolicyDecision decision = m_engine->process_transaction(
            buyer_it->second,
            seller_it->second,
            item_it->second,
            txn_req,
            *m_gateway
        );

        json response = {
            {"status", std::string(to_string(decision.status))},
            {"approved", decision.approved},
            {"reason", decision.reason},
            {"evaluated_amount", decision.evaluated_amount},
            {"upstream_payment_id", decision.upstream_payment_id},
            {"remaining_inventory", item_it->second.stock_quantity}
        };

        res.status = decision.approved ? 200 : 200; // Returns 200 with structured decision payload
        res.set_content(response.dump(2), "application/json");
    });

    // 3. GET /logs Endpoint
    m_server->Get("/logs", [this](const httplib::Request&, httplib::Response& res) {
        std::ifstream file(m_audit_log_path);
        if (!file.is_open()) {
            json empty_array = json::array();
            res.set_content(empty_array.dump(2), "application/json");
            return;
        }

        std::string raw_content((std::istreambuf_iterator<char>(file)),
                                std::istreambuf_iterator<char>());

        // Trim trailing whitespace and commas
        std::string trimmed = raw_content;
        while (!trimmed.empty() && (std::isspace(static_cast<unsigned char>(trimmed.back())) || trimmed.back() == ',')) {
            trimmed.pop_back();
        }

        json log_array = json::array();

        if (!trimmed.empty()) {
            try {
                // Primary path: parse directly using nlohmann::json
                if (trimmed.front() == '[' && trimmed.back() == ']') {
                    log_array = json::parse(trimmed);
                } else {
                    log_array = json::parse("[" + trimmed + "]");
                }
            } catch (const json::parse_error&) {
                // Graceful fallback for partially-written or malformed trailing records:
                // Parse individual objects using nlohmann::json and skip invalid entries
                log_array = json::array();
                std::istringstream stream(raw_content);
                std::string current_obj;
                std::string line;
                while (std::getline(stream, line)) {
                    current_obj += line + "\n";
                    if (line.find('}') != std::string::npos) {
                        std::string candidate = current_obj;
                        while (!candidate.empty() && 
                               (std::isspace(static_cast<unsigned char>(candidate.back())) || candidate.back() == ',')) {
                            candidate.pop_back();
                        }
                        try {
                            json item = json::parse(candidate);
                            log_array.push_back(std::move(item));
                            current_obj.clear();
                        } catch (const json::parse_error&) {
                            // Continue accumulating if multi-line or skip if invalid
                        }
                    }
                }
            } catch (const std::exception& e) {
                std::cerr << "[ACG HTTP Server] Error parsing audit logs: " << e.what() << std::endl;
                log_array = json::array();
            }
        }

        res.set_content(log_array.dump(2), "application/json");
    });
}

bool HttpServer::listen(const std::string& host, int port) {
    std::cout << "[ACG HTTP Server] Listening on http://" << host << ":" << port << std::endl;
    return m_server->listen(host, port);
}

void HttpServer::stop() {
    if (m_server && m_server->is_running()) {
        m_server->stop();
    }
}

} // namespace acg
