#include "acg/PolicyEngine.hpp"
#include "acg/Types.hpp"
#include "acg/RazorpayGatewayMock.hpp"
#include <iostream>
#include <cassert>
#include <limits>
#include <string>

#define TEST_PASS(name) std::cout << "  \033[32m✔\033[0m PASS: " << name << std::endl
#define TEST_FAIL(name, msg) do { \
    std::cerr << "  \033[31m✘\033[0m FAIL: " << name << " -> " << msg << std::endl; \
    exit(1); \
} while (0)

using namespace acg;

void test_subunit_math_and_approval() {
    PolicyEngine engine;
    Agent buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "AI Procurement Agent",
        .max_spending_limit = 100000, // ₹10.00 in micro-subunits
        .currency = "INR",
        .is_active = true
    };
    Agent seller{
        .agent_id = "agent_seller_002",
        .agent_name = "AI Cloud Vendor",
        .max_spending_limit = 5000000,
        .currency = "INR",
        .is_active = true
    };
    TransactionRequest req{
        .transaction_id = "txn_test_001",
        .buyer_agent_id = "agent_buyer_001",
        .seller_agent_id = "agent_seller_002",
        .item_id = "item_gpu_hours",
        .quantity = 2,
        .unit_price = 25000, // ₹2.50
        .total_amount = 50000, // 2 * 25000 = 50000 (₹5.00)
        .currency = "INR"
    };

    auto decision = engine.evaluate_detailed(buyer, seller, req);
    if (!decision.approved || decision.status != PolicyStatus::Approved) {
        TEST_FAIL("test_subunit_math_and_approval", "Expected transaction to be Approved");
    }
    TEST_PASS("test_subunit_math_and_approval");
}

void test_spending_limit_rejection() {
    PolicyEngine engine;
    Agent buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "AI Procurement Agent",
        .max_spending_limit = 100000, // ₹10.00
        .currency = "INR",
        .is_active = true
    };
    TransactionRequest req{
        .transaction_id = "txn_test_002",
        .buyer_agent_id = "agent_buyer_001",
        .seller_agent_id = "agent_seller_002",
        .item_id = "item_gpu_hours",
        .quantity = 5,
        .unit_price = 25000, // ₹2.50
        .total_amount = 125000, // ₹12.50 (exceeds ₹10.00 limit)
        .currency = "INR"
    };

    auto decision = engine.evaluate(buyer, req);
    if (decision.approved || decision.status != PolicyStatus::RejectedExceedsLimit) {
        TEST_FAIL("test_spending_limit_rejection", "Expected RejectedExceedsLimit");
    }
    TEST_PASS("test_spending_limit_rejection");
}

void test_currency_mismatch_rejection() {
    PolicyEngine engine;
    Agent buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "AI Procurement Agent",
        .max_spending_limit = 100000,
        .currency = "INR",
        .is_active = true
    };
    TransactionRequest req{
        .transaction_id = "txn_test_003",
        .buyer_agent_id = "agent_buyer_001",
        .seller_agent_id = "agent_seller_002",
        .item_id = "item_gpu_hours",
        .quantity = 1,
        .unit_price = 25000,
        .total_amount = 25000,
        .currency = "USD" // Mismatched currency
    };

    auto decision = engine.evaluate(buyer, req);
    if (decision.approved || decision.status != PolicyStatus::RejectedCurrencyMismatch) {
        TEST_FAIL("test_currency_mismatch_rejection", "Expected RejectedCurrencyMismatch");
    }
    TEST_PASS("test_currency_mismatch_rejection");
}

void test_arithmetic_overflow_rejection() {
    PolicyEngine engine;
    Agent buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "AI Procurement Agent",
        .max_spending_limit = std::numeric_limits<MoneyAmount>::max(),
        .currency = "INR",
        .is_active = true
    };
    TransactionRequest req{
        .transaction_id = "txn_test_004",
        .buyer_agent_id = "agent_buyer_001",
        .seller_agent_id = "agent_seller_002",
        .item_id = "item_gpu_hours",
        .quantity = 2,
        .unit_price = std::numeric_limits<MoneyAmount>::max() - 10,
        .total_amount = std::numeric_limits<MoneyAmount>::max(),
        .currency = "INR"
    };

    auto decision = engine.evaluate(buyer, req);
    if (decision.approved || decision.status != PolicyStatus::RejectedArithmeticOverflow) {
        TEST_FAIL("test_arithmetic_overflow_rejection", "Expected RejectedArithmeticOverflow");
    }
    TEST_PASS("test_arithmetic_overflow_rejection");
}

void test_mismatched_calculated_total() {
    PolicyEngine engine;
    Agent buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "AI Procurement Agent",
        .max_spending_limit = 100000,
        .currency = "INR",
        .is_active = true
    };
    TransactionRequest req{
        .transaction_id = "txn_test_005",
        .buyer_agent_id = "agent_buyer_001",
        .seller_agent_id = "agent_seller_002",
        .item_id = "item_gpu_hours",
        .quantity = 2,
        .unit_price = 25000,
        .total_amount = 40000, // Incorrect total (should be 50000)
        .currency = "INR"
    };

    auto decision = engine.evaluate(buyer, req);
    if (decision.approved || decision.status != PolicyStatus::RejectedInvalidAmount) {
        TEST_FAIL("test_mismatched_calculated_total", "Expected RejectedInvalidAmount");
    }
    TEST_PASS("test_mismatched_calculated_total");
}

void test_self_transaction_rejection() {
    PolicyEngine engine;
    Agent buyer{
        .agent_id = "agent_same_001",
        .agent_name = "AI Self Agent",
        .max_spending_limit = 100000,
        .currency = "INR",
        .is_active = true
    };
    Agent seller{
        .agent_id = "agent_same_001", // Same ID as buyer
        .agent_name = "AI Self Agent",
        .max_spending_limit = 100000,
        .currency = "INR",
        .is_active = true
    };
    TransactionRequest req{
        .transaction_id = "txn_test_006",
        .buyer_agent_id = "agent_same_001",
        .seller_agent_id = "agent_same_001",
        .item_id = "item_gpu_hours",
        .quantity = 1,
        .unit_price = 25000,
        .total_amount = 25000,
        .currency = "INR"
    };

    auto decision = engine.evaluate_detailed(buyer, seller, req);
    if (decision.approved || decision.status != PolicyStatus::RejectedSelfTransaction) {
        TEST_FAIL("test_self_transaction_rejection", "Expected RejectedSelfTransaction");
    }
    TEST_PASS("test_self_transaction_rejection");
}

void test_inactive_agent_rejection() {
    PolicyEngine engine;
    Agent inactive_buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "AI Inactive Agent",
        .max_spending_limit = 100000,
        .currency = "INR",
        .is_active = false // Disabled
    };
    TransactionRequest req{
        .transaction_id = "txn_test_007",
        .buyer_agent_id = "agent_buyer_001",
        .seller_agent_id = "agent_seller_002",
        .item_id = "item_gpu_hours",
        .quantity = 1,
        .unit_price = 25000,
        .total_amount = 25000,
        .currency = "INR"
    };

    auto decision = engine.evaluate(inactive_buyer, req);
    if (decision.approved || decision.status != PolicyStatus::RejectedInactiveAgent) {
        TEST_FAIL("test_inactive_agent_rejection", "Expected RejectedInactiveAgent for buyer");
    }
    TEST_PASS("test_inactive_agent_rejection");
}

void test_inventory_rollback_on_upstream_timeout() {
    PolicyEngine engine;
    Agent buyer{
        .agent_id = "agent_buyer_001",
        .agent_name = "AI Procurement Agent",
        .max_spending_limit = 100000,
        .currency = "INR",
        .is_active = true
    };
    Agent seller{
        .agent_id = "agent_seller_002",
        .agent_name = "AI Cloud Vendor",
        .max_spending_limit = 5000000,
        .currency = "INR",
        .is_active = true
    };
    InventoryItem item{
        .item_id = "item_gpu_hours",
        .name = "GPU Compute Hours",
        .unit_price = 25000,
        .stock_quantity = 10
    };
    TransactionRequest req{
        .transaction_id = "txn_test_rollback",
        .buyer_agent_id = "agent_buyer_001",
        .seller_agent_id = "agent_seller_002",
        .item_id = "item_gpu_hours",
        .quantity = 2,
        .unit_price = 25000,
        .total_amount = 50000,
        .currency = "INR"
    };

    // Custom Mock Gateway that always throws GatewayTimeoutException
    class FailingGatewayMock : public IRazorpayGateway {
    public:
        std::string process_payment(const TransactionRequest& r) override {
            throw GatewayTimeoutException("Simulated HTTP 504 Timeout on " + r.transaction_id);
        }
    } failing_gateway;

    auto decision = engine.process_transaction(buyer, seller, item, req, failing_gateway);

    if (decision.approved || decision.status != PolicyStatus::RejectedUpstreamTimeout) {
        TEST_FAIL("test_inventory_rollback_on_upstream_timeout", "Expected RejectedUpstreamTimeout");
    }
    // Verify inventory was restored to 10
    if (item.stock_quantity != 10) {
        TEST_FAIL("test_inventory_rollback_on_upstream_timeout", "Stock should remain 10 after rollback");
    }
    TEST_PASS("test_inventory_rollback_on_upstream_timeout");
}

int main() {
    std::cout << "\n==================================================" << std::endl;
    std::cout << "   Agentic Commerce Gateway (ACG) - Unit Tests    " << std::endl;
    std::cout << "==================================================\n" << std::endl;

    test_subunit_math_and_approval();
    test_spending_limit_rejection();
    test_currency_mismatch_rejection();
    test_arithmetic_overflow_rejection();
    test_mismatched_calculated_total();
    test_self_transaction_rejection();
    test_inactive_agent_rejection();
    test_inventory_rollback_on_upstream_timeout();

    std::cout << "\n\033[32m✔ All 8 PolicyEngine unit tests passed successfully!\033[0m\n" << std::endl;
    return 0;
}
