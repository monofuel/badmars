FROM node:argon

RUN npm install -g gulp

RUN mkdir /server-npm
COPY server-package.json /server-npm/package.json
WORKDIR /server-npm
RUN npm install

RUN mkdir /client-npm
COPY client-package.json /client-npm/package.json
WORKDIR /client-npm
RUN npm install

RUN echo 3
RUN git clone https://github.com/monofuel/badMars-JS /badmars

WORKDIR /badmars/server
RUN cp -r /server-npm/node_modules ./
WORKDIR /badmars/client
RUN cp -r /client-npm/node_modules ./
RUN make copy
RUN gulp transpile
WORKDIR /badmars/server
EXPOSE 3002


ENV BADMARS_DB rethinkdb-driver
ENV BADMARS_AUTH_SERVER mongo
ENV BADMARS_WS_PUBLIC_PORT 31085
ENV BADMARS_WS_SERVER ws://192.168.11.161
ENV GOOGLE_OAUTH_ID 1052011336868-oimio3m9j38427o455m4233i3pv8bs8e.apps.googleusercontent.com
ENV GOOGLE_OAUTH_CALLBACK https://japura.net/auth/google/callback
