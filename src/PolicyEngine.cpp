#include "acg/PolicyEngine.hpp"
#include <limits>

namespace acg {

PolicyEngine::PolicyEngine(std::shared_ptr<AuditLogger> logger)
    : m_logger(std::move(logger)) {}

PolicyDecision PolicyEngine::evaluate(
    const Agent& buyer,
    const TransactionRequest& request
) const noexcept {
    // 1. Validate Buyer active status
    if (!buyer.is_active) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedInactiveAgent,
            .reason = "Buyer agent account is inactive or disabled.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // 2. Validate Currency alignment
    if (buyer.currency != request.currency) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedCurrencyMismatch,
            .reason = "Transaction currency (" + request.currency + 
                      ") does not match buyer currency (" + buyer.currency + ").",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // 3. Validate Quantity & Pricing (Prevent zero/negative amounts)
    if (request.quantity <= 0 || request.unit_price <= 0 || request.total_amount <= 0) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedInvalidAmount,
            .reason = "Quantity, unit price, and total amount must be strictly positive.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // 4. Prevent integer overflow on multiplication (quantity * unit_price)
    if (request.quantity > 0 && 
        request.unit_price > std::numeric_limits<MoneyAmount>::max() / request.quantity) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedArithmeticOverflow,
            .reason = "Arithmetic overflow detected in transaction amount calculation.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    const MoneyAmount computed_total = static_cast<MoneyAmount>(request.quantity) * request.unit_price;
    if (computed_total != request.total_amount) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedInvalidAmount,
            .reason = "Mismatched total amount: expected " + std::to_string(computed_total) + 
                      ", received " + std::to_string(request.total_amount) + ".",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // 5. Evaluate against Maximum Spending Limit
    if (request.total_amount > buyer.max_spending_limit) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedExceedsLimit,
            .reason = "Transaction total (" + std::to_string(request.total_amount) + 
                      ") exceeds buyer spending limit (" + std::to_string(buyer.max_spending_limit) + ").",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // Baseline Transaction Policy Approved
    return PolicyDecision{
        .status = PolicyStatus::Approved,
        .reason = "Transaction policy evaluation succeeded.",
        .approved = true,
        .evaluated_amount = request.total_amount
    };
}

PolicyDecision PolicyEngine::evaluate_detailed(
    const Agent& buyer,
    const Agent& seller,
    const TransactionRequest& request,
    MoneyAmount current_cumulative_spend
) const noexcept {
    // Check self-transaction
    if (buyer.agent_id == seller.agent_id) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedSelfTransaction,
            .reason = "Self-transactions between identical agent IDs are prohibited.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // Check seller status
    if (!seller.is_active) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedInactiveAgent,
            .reason = "Seller agent account is inactive or disabled.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // Perform baseline evaluation
    auto base_decision = evaluate(buyer, request);
    if (!base_decision.approved) {
        return base_decision;
    }

    // Check cumulative spend limit with overflow protection
    if (current_cumulative_spend < 0 || 
        request.total_amount > std::numeric_limits<MoneyAmount>::max() - current_cumulative_spend) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedArithmeticOverflow,
            .reason = "Arithmetic overflow detected in cumulative spending calculation.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    const MoneyAmount projected_spend = current_cumulative_spend + request.total_amount;
    if (projected_spend > buyer.max_spending_limit) {
        return PolicyDecision{
            .status = PolicyStatus::RejectedExceedsLimit,
            .reason = "Projected cumulative spend (" + std::to_string(projected_spend) + 
                      ") exceeds buyer spending limit (" + std::to_string(buyer.max_spending_limit) + ").",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    return base_decision;
}

PolicyDecision PolicyEngine::process_transaction(
    const Agent& buyer,
    const Agent& seller,
    InventoryItem& inventory,
    const TransactionRequest& request,
    IRazorpayGateway& gateway
) {
    // 1. Evaluate baseline and multi-party policy rules
    PolicyDecision decision = evaluate_detailed(buyer, seller, request);
    if (!decision.approved) {
        if (m_logger) {
            m_logger->log_decision(request, decision);
        }
        return decision;
    }

    // 2. Validate and reserve inventory
    if (inventory.stock_quantity < request.quantity) {
        decision = PolicyDecision{
            .status = PolicyStatus::RejectedInsufficientInventory,
            .reason = "Insufficient inventory stock for item " + inventory.item_id + 
                      ". Available: " + std::to_string(inventory.stock_quantity) + 
                      ", Requested: " + std::to_string(request.quantity),
            .approved = false,
            .evaluated_amount = request.total_amount
        };
        if (m_logger) {
            m_logger->log_decision(request, decision);
        }
        return decision;
    }

    // Reserve inventory
    inventory.stock_quantity -= request.quantity;

    // 3. Dispatch to Upstream Gateway with Exception Handling & Rollback
    try {
        std::string payment_id = gateway.process_payment(request);
        decision.approved = true;
        decision.status = PolicyStatus::Approved;
        decision.reason = "Transaction processed and settled successfully.";
        decision.upstream_payment_id = payment_id;
    } catch (const GatewayTimeoutException& ex) {
        // Roll back inventory reservation
        inventory.stock_quantity += request.quantity;

        decision = PolicyDecision{
            .status = PolicyStatus::RejectedUpstreamTimeout,
            .reason = std::string("Upstream failure caught: ") + ex.what() + 
                      ". Inventory reservation rolled back successfully.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    } catch (const std::exception& ex) {
        // Roll back inventory reservation on general upstream exception
        inventory.stock_quantity += request.quantity;

        decision = PolicyDecision{
            .status = PolicyStatus::RejectedUpstreamTimeout,
            .reason = std::string("Unexpected upstream exception: ") + ex.what() + 
                      ". Inventory reservation rolled back.",
            .approved = false,
            .evaluated_amount = request.total_amount
        };
    }

    // 4. Record structured audit log
    if (m_logger) {
        m_logger->log_decision(request, decision);
    }

    return decision;
}

} // namespace acg
