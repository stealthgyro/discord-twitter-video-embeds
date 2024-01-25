#Possibly jus some useful commands, or just me playing around with stuff, figured I'd keep it here for reference
docker-compose down && docker-compose build && docker-compose up -d && docker logs -f dev-tilted-embed

#guilty puppet meme.
docker-compose down && docker-compose build && docker-compose up -d && docker logs -f tilted-embed

# Stack changed or something like that and docker compose down didn't work...
docker stop tilted-embed && && docker rm tilted-embed && docker compose build && docker compose up -d && docker logs -f tilted-embed
