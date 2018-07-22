FROM node:alpine

RUN apk update
#install libc6-compat for grpc
RUN apk add libc6-compat
RUN apk add make
RUN apk add bash
RUN apk add shadow
RUN npm install -g gulp supervisor browserify watchify flow-bin babel-watch babel-core node-gyp babel-cli

RUN mkdir /badmars
RUN chown node:node /badmars

USER node

ADD ./package.json badmars/
WORKDIR /badmars


RUN yarn install

ADD . /badmars

EXPOSE 3002

ENV BADMARS_DB rethinkdb
# ENV BADMARS_WS_PUBLIC_PORT 80
ENV BADMARS_WS_SERVER ws://localhost:80
# ENV GOOGLE_OAUTH_ID 1052011336868-oimio3m9j38427o455m4233i3pv8bs8e.apps.googleusercontent.com
# ENV GOOGLE_OAUTH_CALLBACK https://japura.net/auth/google/callback
