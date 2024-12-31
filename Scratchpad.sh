#Possibly jus some useful commands, or just me playing around with stuff, figured I'd keep it here for reference
docker-compose down && docker-compose build && docker-compose up -d && docker logs -f dev-tilted-embed


docker compose down && docker compose build && docker compose up -d && docker logs -f dev-tilted-embed


#guilty puppet meme.
docker-compose down && docker-compose build && docker-compose up -d && docker logs -f tilted-embed

# Stack changed or something like that and docker compose down didn't work...
docker stop tilted-embed && && docker rm tilted-embed && docker compose build && docker compose up -d && docker logs -f tilted-embed



# just faster testing without rebuilding docker.
node --env-file=.env index.js
node --env-file=./ignore/.env index.js

/usr/local/bin/node --env-file=./ignore/.env index.js