# Stage 1: Build stage with compiler, CMake, and dependencies
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy CMake configuration, headers, and source code
COPY CMakeLists.txt ./
COPY include/ ./include/
COPY src/ ./src/

# Compile C++20 backend binary in Release mode
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --config Release --target acg_gateway -j$(nproc)

# Stage 2: Minimal runtime image
FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled binary from builder stage
COPY --from=builder /app/build/acg_gateway ./acg_gateway

# Expose backend REST API port
EXPOSE 8088

# Run backend binding to 0.0.0.0 on port 8088
ENTRYPOINT ["./acg_gateway"]
CMD ["8088", "0.0.0.0"]
