#pragma once

#include "Types.hpp"
#include <string>
#include <mutex>
#include <memory>

namespace acg {

class AuditLogger {
public:
    explicit AuditLogger(std::string log_file_path = "audit_log.json");
    ~AuditLogger() = default;

    /// Logs an evaluation decision and writes structured JSON to stdout and the audit file.
    void log_decision(
        const TransactionRequest& request,
        const PolicyDecision& decision
    );

    /// Formats an audit record into a JSON string.
    [[nodiscard]] static std::string to_json(const AuditRecord& record);

    /// Generates an ISO-8601 UTC timestamp string.
    [[nodiscard]] static std::string current_iso_timestamp();

private:
    std::string m_log_file_path;
    std::mutex m_mutex;
};

} // namespace acg
