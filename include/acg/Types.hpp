#pragma once

#include <cstdint>
#include <string>
#include <string_view>

namespace acg {

/// Explicit type alias for monetary values representing integer fractional subunits 
/// (e.g., 1 INR = 10,000 subunits matching DECIMAL(18,4) to guarantee zero floating-point rounding errors).
using MoneyAmount = int64_t;

enum class PolicyStatus : uint8_t {
    Approved = 0,
    RejectedExceedsLimit,
    RejectedInactiveAgent,
    RejectedCurrencyMismatch,
    RejectedInvalidAmount,
    RejectedSelfTransaction,
    RejectedArithmeticOverflow,
    RejectedUpstreamTimeout,
    RejectedInsufficientInventory
};

[[nodiscard]] constexpr std::string_view to_string(PolicyStatus status) noexcept {
    switch (status) {
        case PolicyStatus::Approved: return "Approved";
        case PolicyStatus::RejectedExceedsLimit: return "Rejected: Exceeds Spending Limit";
        case PolicyStatus::RejectedInactiveAgent: return "Rejected: Agent Is Inactive";
        case PolicyStatus::RejectedCurrencyMismatch: return "Rejected: Currency Mismatch";
        case PolicyStatus::RejectedInvalidAmount: return "Rejected: Invalid Transaction Amount";
        case PolicyStatus::RejectedSelfTransaction: return "Rejected: Self Transaction Not Allowed";
        case PolicyStatus::RejectedArithmeticOverflow: return "Rejected: Arithmetic Overflow in Total Amount";
        case PolicyStatus::RejectedUpstreamTimeout: return "Rejected: Upstream Gateway Timeout";
        case PolicyStatus::RejectedInsufficientInventory: return "Rejected: Insufficient Inventory";
    }
    return "Unknown";
}

struct Agent {
    std::string agent_id;
    std::string agent_name;
    MoneyAmount max_spending_limit{0}; // In fractional integer units
    std::string currency{"INR"};
    bool is_active{true};
};

struct InventoryItem {
    std::string item_id;
    std::string sku;
    std::string name;
    MoneyAmount unit_price{0};
    int32_t stock_quantity{0};
    std::string currency{"INR"};
};

struct TransactionRequest {
    std::string transaction_id;
    std::string buyer_agent_id;
    std::string seller_agent_id;
    std::string item_id;
    int32_t quantity{1};
    MoneyAmount unit_price{0};   // In fractional integer units
    MoneyAmount total_amount{0}; // In fractional integer units
    std::string currency{"INR"};
};

struct PolicyDecision {
    PolicyStatus status{PolicyStatus::Approved};
    std::string reason;
    bool approved{false};
    MoneyAmount evaluated_amount{0};
    std::string upstream_payment_id;
};

struct AuditRecord {
    std::string timestamp;
    std::string transaction_id;
    std::string buyer_agent_id;
    std::string seller_agent_id;
    MoneyAmount requested_amount{0};
    std::string decision_status;
    std::string rejection_reason;
};

} // namespace acg
