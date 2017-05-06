FROM node:alpine

RUN apk update
RUN apk add libc6-compat
RUN npm install -g gulp supervisor watchify flow-bin babel-watch babel-core node-gyp

RUN mkdir /badmars
ADD ./package.json badmars/
WORKDIR /badmars

RUN yarn install

ADD . /badmars

EXPOSE 3002
EXPOSE 4474
EXPOSE 7005

ENV BADMARS_DB rethinkdb
ENV BADMARS_WS_PUBLIC_PORT 7005
ENV BADMARS_WS_SERVER ws://192.168.11.119
ENV GOOGLE_OAUTH_ID 1052011336868-oimio3m9j38427o455m4233i3pv8bs8e.apps.googleusercontent.com
ENV GOOGLE_OAUTH_CALLBACK https://japura.net/auth/google/callback
