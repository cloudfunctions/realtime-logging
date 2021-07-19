
env:
	cp .env.local .env

migrate:
	npx sequelize-cli db:migrate

rollback-all:
	npx sequelize-cli db:migrate:undo:all

seed:
	npx sequelize-cli seed:generate --name $$name 

db-seed:
	npx sequelize-cli db:seed:all

db-refresh:
	npx sequelize-cli db:seed:undo:all

