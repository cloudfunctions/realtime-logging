# Create image based on the official Node 10 image from dockerhub
FROM node:16

# Create a directory where our app will be placed
RUN mkdir -p /usr/src/app

# Get all the code needed to run the app
COPY ./src /usr/src/app/

# Change directory so that our commands run inside this new directory
WORKDIR /usr/src/app

# Install dependecies
RUN yarn

# expose application port
EXPOSE 4000

# Run application
CMD [ "node", "server.js" ]

