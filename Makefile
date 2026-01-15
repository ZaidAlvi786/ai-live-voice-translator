.PHONY: install dev-backend dev-frontend docker-up test-load clean

install:
	@echo "Installing Backend..."
	cd backend && python -m venv venv && . venv/bin/activate && pip install -e ".[dev]"
	@echo "Installing Frontend..."
	cd frontend && npm install

dev-backend:
	@echo "Starting Backend..."
	cd backend && . venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "Starting Frontend..."
	cd frontend && npm run dev

docker-up:
	docker-compose up -d

test-load:
	@echo "Running Load Test..."
	python tests/load_test_websockets.py

clean:
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type d -name "node_modules" -exec rm -r {} +
