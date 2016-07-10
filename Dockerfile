FROM node:argon

RUN npm install -g gulp

RUN git clone https://github.com/monofuel/badMars-JS /badmars

WORKDIR /badmars/server
RUN npm install
WORKDIR /badmars/client
RUN npm install
RUN make copy
RUN gulp transpile
WORKDIR /badmars/server
EXPOSE 3002


ENV BADMARS_DB rethinkdb-driver
ENV BADMARS_AUTH_SERVER mongo
