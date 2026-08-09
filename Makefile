up:
	docker compose up -d

down:
	docker compose down

clean:
	docker compose down -v --remove-orphans

