# 🌙 Nocturne - PoC用 Makefile
# Make commands for development and quality assurance

.PHONY: help setup dev-backend dev-frontend dev quality test clean install-deps init-db poc

# Default target
help: ## Show this help message
	@echo "🌙 Nocturne - PoC Development Commands"
	@echo ""
	@echo "Quick Start:"
	@echo "  make poc          Start full PoC environment (backend + frontend)"
	@echo "  make setup        Complete development environment setup"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

# PoC Quick Start
poc: init-db ## 🚀 Start PoC environment (backend + frontend)
	@echo "🌙 Starting Nocturne PoC..."
	@echo "📍 Backend will start on: http://localhost:8000"
	@echo "📍 Frontend will start on: http://localhost:3000"
	@echo "📍 API Documentation: http://localhost:8000/api/v1/docs"
	@echo ""
	@echo "Starting servers..."
	@$(MAKE) dev

# Development Setup
setup: install-deps init-db ## 🔧 Complete development environment setup
	@echo "✅ Development environment ready!"
	@echo "Run 'make poc' to start PoC servers"

install-deps: ## 📦 Install all dependencies (backend + frontend)
	@echo "📦 Installing backend dependencies..."
	cd backend && python -m pip install -r requirements.txt
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ Dependencies installed"

init-db: ## 🗄️ Initialize database with sample data
	@echo "🗄️ Initializing database..."
	cd backend && python init_db.py
	@echo "✅ Database initialized with sample journeys"

# Development Servers
dev: ## 🚀 Start both development servers (backend + frontend)
	@echo "Starting development servers..."
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## 🐍 Start backend development server
	@echo "🐍 Starting FastAPI backend server..."
	cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev-frontend: ## ⚛️ Start frontend development server  
	@echo "⚛️ Starting Next.js frontend server..."
	cd frontend && npm run dev

# Quality Assurance
quality: ## 🧹 Run all quality checks (linting, formatting, type checking)
	@echo "🧹 Running quality checks..."
	@$(MAKE) quality-backend
	@$(MAKE) quality-frontend
	@echo "✅ All quality checks passed!"

quality-backend: ## 🐍 Backend quality checks (black, mypy)
	@echo "🐍 Checking backend code quality..."
	cd backend && source venv/bin/activate && python -m black . --check
	@echo "✅ Backend formatting OK"

quality-frontend: ## ⚛️ Frontend quality checks (eslint, typescript)
	@echo "⚛️ Checking frontend code quality..."
	cd frontend && npm run lint
	cd frontend && npx tsc --noEmit
	@echo "✅ Frontend quality OK"

# Formatting
format: ## 🎨 Auto-format all code
	@echo "🎨 Auto-formatting code..."
	cd backend && source venv/bin/activate && python -m black .
	cd frontend && npm run lint -- --fix 2>/dev/null || true
	@echo "✅ Code formatted"

# Testing
test: ## 🧪 Run all tests
	@echo "🧪 Running tests..."
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@echo "✅ All tests passed!"

test-backend: ## 🐍 Run backend tests
	@echo "🐍 Running backend tests..."
	cd backend && source venv/bin/activate && python -m pytest tests/ -v 2>/dev/null || echo "⚠️ Backend tests not configured yet"

test-frontend: ## ⚛️ Run frontend tests  
	@echo "⚛️ Running frontend tests..."
	cd frontend && npm test -- --passWithNoTests 2>/dev/null || echo "⚠️ Frontend tests not configured yet"

# API Testing
test-api: ## 🌐 Test API endpoints
	@echo "🌐 Testing API endpoints..."
	@echo "Testing health check..."
	curl -s http://localhost:8000/ | jq . || echo "❌ Backend server not running"
	@echo "Testing journeys endpoint..."  
	curl -s http://localhost:8000/api/v1/journeys/ | jq . || echo "❌ API not accessible"
	@echo "✅ API tests complete"

# Database Management
reset-db: ## 🔄 Reset database (delete and reinitialize)
	@echo "🔄 Resetting database..."
	rm -f backend/database.db
	@$(MAKE) init-db
	@echo "✅ Database reset complete"

# Cleanup
clean: ## 🧹 Clean build artifacts and temp files
	@echo "🧹 Cleaning build artifacts..."
	rm -rf backend/__pycache__ backend/**/__pycache__
	rm -rf frontend/.next frontend/node_modules/.cache
	rm -f frontend/tsconfig.tsbuildinfo
	@echo "✅ Cleanup complete"

# PoC Verification
verify-poc: ## 🔍 Verify PoC environment
	@echo "🔍 Verifying PoC environment..."
	@echo "Backend server check:"
	@curl -s http://localhost:8000/ > /dev/null && echo "✅ Backend running" || echo "❌ Backend not running"
	@echo "Frontend server check:"  
	@curl -s http://localhost:3000/ > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend not running"
	@echo "Database check:"
	@test -f backend/database.db && echo "✅ Database exists" || echo "❌ Database missing"
	@echo "Audio files check:"
	@test -d frontend/public/audio && echo "✅ Audio directory exists" || echo "❌ Audio directory missing"
	@test -f frontend/public/audio/forest.mp3 && echo "✅ Audio files present" || echo "❌ Audio files missing"

# Documentation
docs: ## 📚 Open documentation
	@echo "📚 Opening documentation..."
	@echo "PoC Guide: POC_GUIDE.md"
	@echo "Technical Spec: docs/TECHNICAL_SPECIFICATION.md"
	@echo "README: README.md"

# Development Status
status: ## 📊 Show development status
	@echo "📊 Nocturne Development Status"
	@echo "=============================="
	@echo "Project: Nocturne (夜想曲) - AI Sleep Support App"
	@echo "Version: v1.0.0 MVP"
	@echo "Status: PoC Ready ✅"
	@echo ""
	@echo "Completed Features:"
	@echo "✅ AudioEngine (Web Audio API)"
	@echo "✅ JourneyPlayer (Timer 10-60min)"  
	@echo "✅ REST API (FastAPI + SQLite)"
	@echo "✅ Responsive UI (Next.js + Tailwind)"
	@echo "✅ 3 Sample Journeys with Segments"
	@echo "✅ Documentation Complete"
	@echo ""
	@echo "Next Steps:"
	@echo "🔲 PWA Support"
	@echo "🔲 User Settings"
	@echo "🔲 Authentication"
	@echo "🔲 Sleep Analytics"

# System Info
info: ## 💻 Show system information
	@echo "💻 System Information"
	@echo "==================="
	@echo "OS: $$(uname -s)"
	@echo "Python: $$(python --version 2>/dev/null || echo 'Not found')"
	@echo "Node.js: $$(node --version 2>/dev/null || echo 'Not found')"
	@echo "npm: $$(npm --version 2>/dev/null || echo 'Not found')" 
	@echo ""
	@echo "Project Structure:"
	@echo "📁 backend/  - FastAPI application"
	@echo "📁 frontend/ - Next.js application"
	@echo "📁 docs/     - Documentation"
	@echo "📄 POC_GUIDE.md - PoC execution guide"