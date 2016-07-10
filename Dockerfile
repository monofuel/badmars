FROM node:argon

#RUN npm install -g gulp browserify

RUN mkdir -p /badmars
WORKDIR /badmars
COPY . /badmars
#WORKDIR /badmars/server
#RUN npm install
#WORKDIR /badmars/client
#RUN npm install
#RUN make copy
#RUN gulp transpile
WORKDIR /badmars/server
EXPOSE 3002


ENV BADMARS_DB rethinkdb-driver
ENV BADMARS_AUTH_SERVER mongo
