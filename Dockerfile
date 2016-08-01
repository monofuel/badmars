FROM node:argon

RUN npm install -g gulp

COPY . /badmars

WORKDIR /badmars/server
EXPOSE 3002


ENV BADMARS_DB rethinkdb
ENV BADMARS_WS_PUBLIC_PORT 31085
ENV BADMARS_WS_SERVER ws://localhost
ENV GOOGLE_OAUTH_ID 1052011336868-oimio3m9j38427o455m4233i3pv8bs8e.apps.googleusercontent.com
ENV GOOGLE_OAUTH_CALLBACK https://japura.net/auth/google/callback
