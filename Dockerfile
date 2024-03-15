FROM node:lts

RUN mkdir -p /usr/src/app && \
    chown -R node:node /usr/src/app
WORKDIR /usr/src/app

RUN apt-get update \ 
    && apt-get install -y jq \
    && apt-get clean

RUN mkdir /usr/src/app/plugins
WORKDIR /usr/src/app/plugins
RUN git clone https://$(BBTOKEN)@github.com/rayhhome/spring24-nodebb-over-20-anonymous-composer.git
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

COPY --chown=node:node install/package.json /usr/src/app/package.json

USER node

RUN chown -R node:node /usr/src/app/plugins/spring24-nodebb-over-20-anonymous-composer

RUN npm link /usr/src/app/plugins/spring24-nodebb-over-20-anonymous-composer

RUN npm install && \
    npm cache clean --force

COPY --chown=node:node . /usr/src/app

ENV NODE_ENV=production \
    daemon=false \
    silent=false

EXPOSE 4567

RUN chmod +x create_config.sh

CMD  ./create_config.sh -n "${SETUP}" && ./nodebb setup || node ./nodebb build; node ./nodebb start
