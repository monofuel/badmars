FROM node:argon

RUN npm install -g gulp supervisor watchify flow-bin babel-watch

RUN mkdir /badmars
ADD ./package.json badmars/
WORKDIR /badmars

RUN curl -o- -L https://yarnpkg.com/install.sh | bash
RUN /bin/bash -c 'source ~/.bashrc && yarn install'

ADD . /badmars

#RUN gulp client

EXPOSE 3002
EXPOSE 4474
EXPOSE 7005

ENV BADMARS_DB rethinkdb
ENV BADMARS_WS_PUBLIC_PORT 7005
ENV BADMARS_WS_SERVER ws://192.168.11.119
ENV GOOGLE_OAUTH_ID 1052011336868-oimio3m9j38427o455m4233i3pv8bs8e.apps.googleusercontent.com
ENV GOOGLE_OAUTH_CALLBACK https://japura.net/auth/google/callback
