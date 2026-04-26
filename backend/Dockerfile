FROM python:3.14-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy lock files
COPY uv.lock pyproject.toml ./

# Install dependencies
RUN uv sync --frozen

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Run with uv
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
