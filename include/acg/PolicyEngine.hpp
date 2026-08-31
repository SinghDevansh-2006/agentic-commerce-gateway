#pragma once

#include "Types.hpp"
#include "AuditLogger.hpp"
#include "RazorpayGatewayMock.hpp"
#include <memory>
#include <string_view>

namespace acg {

class PolicyEngine {
public:
    explicit PolicyEngine(std::shared_ptr<AuditLogger> logger = std::make_shared<AuditLogger>());
    ~PolicyEngine() = default;

    /// Evaluates an incoming transaction request against buyer spending limits and status.
    [[nodiscard]] PolicyDecision evaluate(
        const Agent& buyer,
        const TransactionRequest& request
    ) const noexcept;

    /// Evaluates a multi-party transaction checking buyer limits, seller authenticity, currency, and cumulative spending.
    [[nodiscard]] PolicyDecision evaluate_detailed(
        const Agent& buyer,
        const Agent& seller,
        const TransactionRequest& request,
        MoneyAmount current_cumulative_spend = 0
    ) const noexcept;

    /// Executes complete transaction lifecycle: policy check -> inventory lock -> upstream payment -> failure rollback & audit logging.
    PolicyDecision process_transaction(
        const Agent& buyer,
        const Agent& seller,
        InventoryItem& inventory,
        const TransactionRequest& request,
        IRazorpayGateway& gateway
    );

    [[nodiscard]] std::shared_ptr<AuditLogger> get_logger() const noexcept {
        return m_logger;
    }

private:
    std::shared_ptr<AuditLogger> m_logger;
};

} // namespace acg
