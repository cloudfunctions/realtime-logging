dir=${CURDIR}
export COMPOSE_PROJECT_NAME=rtlogs

## Read .env file
ifndef REMOTE_HOST
	# Determine if .env file exist
	ifneq ("$(wildcard .env)","")
		include .env
	endif
endif

project=-p ${COMPOSE_PROJECT_NAME}
service=${COMPOSE_PROJECT_NAME}:latest
interactive:=$(shell [ -t 0 ] && echo 1)
ifneq ($(interactive),1)
	optionT=-T
endif

build:
	docker-compose up -d --build

build-service:
	docker-compose up -d --build $$name

build-prod:
	docker-compose -f docker-compose.prod.yml up -d --build

start:
	docker-compose up -d

start-service:
	docker-compose up -d $$name

start-prod:
	docker-compose -f docker-compose.prod.yml up -d

stop:
	docker-compose down 

stop-prod:
	docker-compose -f docker-compose.prod.yml down 

restart: stop start

clean:
	docker-compose down -v