#include "acg/AuditLogger.hpp"
#include <iostream>
#include <fstream>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace acg {

AuditLogger::AuditLogger(std::string log_file_path)
    : m_log_file_path(std::move(log_file_path)) {}

std::string AuditLogger::current_iso_timestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % 1000;

    std::stringstream ss;
    std::tm bt{};
#if defined(_MSC_VER)
    gmtime_s(&bt, &in_time_t);
#else
    gmtime_r(&in_time_t, &bt);
#endif
    ss << std::put_time(&bt, "%Y-%m-%dT%H:%M:%S")
       << '.' << std::setfill('0') << std::setw(3) << ms.count() << "Z";
    return ss.str();
}

std::string AuditLogger::to_json(const AuditRecord& record) {
    std::stringstream ss;
    ss << "{\n"
       << "  \"timestamp\": \"" << record.timestamp << "\",\n"
       << "  \"transaction_id\": \"" << record.transaction_id << "\",\n"
       << "  \"buyer_agent_id\": \"" << record.buyer_agent_id << "\",\n"
       << "  \"seller_agent_id\": \"" << record.seller_agent_id << "\",\n"
       << "  \"requested_amount\": " << record.requested_amount << ",\n"
       << "  \"decision_status\": \"" << record.decision_status << "\",\n"
       << "  \"rejection_reason\": \"" << record.rejection_reason << "\"\n"
       << "}";
    return ss.str();
}

void AuditLogger::log_decision(
    const TransactionRequest& request,
    const PolicyDecision& decision
) {
    AuditRecord record{
        .timestamp = current_iso_timestamp(),
        .transaction_id = request.transaction_id,
        .buyer_agent_id = request.buyer_agent_id,
        .seller_agent_id = request.seller_agent_id,
        .requested_amount = request.total_amount,
        .decision_status = std::string(to_string(decision.status)),
        .rejection_reason = decision.approved ? "" : decision.reason
    };

    std::string json_payload = to_json(record);

    std::lock_guard<std::mutex> lock(m_mutex);

    // 1. Output to stdout
    std::cout << "\n[AUDIT LOG EVENT]\n" << json_payload << "\n" << std::endl;

    // 2. Append to log file
    std::ofstream out(m_log_file_path, std::ios::app);
    if (out.is_open()) {
        out << json_payload << ",\n";
    }
}

} // namespace acg
