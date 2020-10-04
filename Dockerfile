 FROM node:alpine

WORKDIR /code

COPY . .

RUN ["yarn"]
RUN ["yarn", "build"]
CMD ["yarn", "js:start"]