#pragma once

#include "Types.hpp"
#include <stdexcept>
#include <string>
#include <atomic>

namespace acg {

/// Custom exception representing an upstream gateway network timeout / socket failure.
class GatewayTimeoutException : public std::runtime_error {
public:
    explicit GatewayTimeoutException(const std::string& msg)
        : std::runtime_error(msg) {}
};

/// Upstream payment gateway interface for dependency injection.
class IRazorpayGateway {
public:
    virtual ~IRazorpayGateway() = default;
    virtual std::string process_payment(const TransactionRequest& request) = 0;
};

/// Mock gateway wrapper simulating network timeouts/API drops on every 3rd transaction request.
class RazorpayGatewayMock : public IRazorpayGateway {
public:
    RazorpayGatewayMock() = default;

    /// Processes payment or triggers simulated network failure on every 3rd request.
    std::string process_payment(const TransactionRequest& request) override {
        uint64_t count = ++m_request_counter;
        if (count % 3 == 0) {
            throw GatewayTimeoutException(
                "Razorpay upstream gateway timeout: HTTP 504 Gateway Timeout on request #" + 
                std::to_string(count) + " for txn " + request.transaction_id
            );
        }
        return "pay_rzp_mock_" + request.transaction_id + "_" + std::to_string(count);
    }

    [[nodiscard]] uint64_t get_total_requests() const noexcept {
        return m_request_counter.load();
    }

    void reset_counter() noexcept {
        m_request_counter.store(0);
    }

private:
    std::atomic<uint64_t> m_request_counter{0};
};

} // namespace acg
