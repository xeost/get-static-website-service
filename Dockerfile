# Use official Deno image as base
FROM denoland/deno:alpine-1.41.0

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Cache dependencies
RUN deno cache main.ts

# Expose port (if needed, adjust accordingly)
EXPOSE 8000

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-env", "main.ts"]