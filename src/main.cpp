#include "acg/HttpServer.hpp"
#include "acg/PolicyEngine.hpp"
#include "acg/RazorpayGatewayMock.hpp"
#include "acg/AuditLogger.hpp"
#include <iostream>
#include <csignal>

std::shared_ptr<acg::HttpServer> g_server_instance = nullptr;

void signal_handler(int signal) {
    if (signal == SIGINT || signal == SIGTERM) {
        std::cout << "\n[ACG Gateway] Shutdown signal received. Stopping server..." << std::endl;
        if (g_server_instance) {
            g_server_instance->stop();
        }
    }
}

int main(int argc, char* argv[]) {
    std::string host = "0.0.0.0";
    int port = 8080;

    if (argc >= 2) {
        port = std::stoi(argv[1]);
    }
    if (argc >= 3) {
        host = argv[2];
    }

    std::cout << "============================================================\n";
    std::cout << "     Agentic Commerce Gateway (ACG) - REST API Service      \n";
    std::cout << "============================================================\n";

    // Setup core components
    auto logger = std::make_shared<acg::AuditLogger>("audit_log.json");
    auto engine = std::make_shared<acg::PolicyEngine>(logger);
    auto gateway = std::make_shared<acg::RazorpayGatewayMock>();

    auto server = std::make_shared<acg::HttpServer>(engine, gateway, logger, "audit_log.json");
    g_server_instance = server;

    // Register Default Authorized Agents
    acg::Agent buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "ProcurementAgent_Alpha",
        .max_spending_limit = 100'000, // 100,000 sub-units (e.g. 10.0000 INR)
        .currency = "INR",
        .is_active = true
    };
    server->register_agent(buyer);

    acg::Agent seller{
        .agent_id = "agent_seller_002",
        .agent_name = "CloudVendorAgent_Beta",
        .max_spending_limit = 5'000'000,
        .currency = "INR",
        .is_active = true
    };
    server->register_agent(seller);

    // Register Default Inventory Catalog
    acg::InventoryItem item{
        .item_id = "item_gpu_hours",
        .sku = "SKU-GPU-H100-01",
        .name = "Dedicated GPU Compute Hour",
        .unit_price = 25'000,
        .stock_quantity = 10,
        .currency = "INR"
    };
    server->register_inventory_item(item);

    std::cout << "Pre-registered Agents: " << buyer.agent_id << " (Limit: " << buyer.max_spending_limit 
              << "), " << seller.agent_id << "\n";
    std::cout << "Pre-registered Item  : " << item.item_id << " (Stock: " << item.stock_quantity 
              << ", Unit Price: " << item.unit_price << ")\n";

    // Register signal handlers for graceful termination
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);

    std::cout << "Starting HTTP server on http://" << host << ":" << port << " ...\n";
    server->listen(host, port);

    std::cout << "[ACG Gateway] Server stopped cleanly.\n";
    return 0;
}
