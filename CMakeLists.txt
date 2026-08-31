cmake_minimum_required(VERSION 3.20)
project(AgenticCommerceGateway VERSION 0.1.0 LANGUAGES CXX)

# Enforce C++20 Standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile commands for LSP/clangd
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Multi-threading support for HTTP server
find_package(Threads REQUIRED)

# Compiler flags and warnings
if (MSVC)
    add_compile_options(/W4 /permissive-)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Wconversion -Wshadow -O3)
endif()

# Core ACG Library
add_library(acg_core
    src/PolicyEngine.cpp
    src/AuditLogger.cpp
    src/HttpServer.cpp
)
target_include_directories(acg_core PUBLIC 
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)
target_link_libraries(acg_core PUBLIC Threads::Threads)

# Gateway Executable
add_executable(acg_gateway
    src/main.cpp
)
target_link_libraries(acg_gateway PRIVATE acg_core Threads::Threads)
