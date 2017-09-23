#!/bin/bash
set -euo pipefail

# either have minikube running with the registry exposed on port 5000
#or run your own registry and do whatever you want (i'm not the boss)

if [ ! -f ./version.txt ]; then
    echo 1 > ./version.txt
fi

VERSION=`cat ./version.txt`


NEW_VERSION=`echo ${VERSION} + 1 | bc`
echo "-----------------------------------------"
echo "Current version:  ${VERSION}"
echo "Next version:     ${NEW_VERSION}"
echo "-----------------------------------------"

echo "Preparing project"
echo "-----------------------------------------"

make dockerBuild

echo $NEW_VERSION > ./version.txt
echo "Building images"
echo "-----------------------------------------"

docker build -t localhost:5000/badmars_node:v${NEW_VERSION} .
docker build -t localhost:5000/badmars_go:v${NEW_VERSION} -f ./Dockerfile-go .
cd nginx && docker build -t localhost:5000/badmars_proxy:v${NEW_VERSION} .

echo "-----------------------------------------"
echo "Deploying images"
echo "-----------------------------------------"
docker push localhost:5000/badmars_node:v${NEW_VERSION}
docker push localhost:5000/badmars_go:v${NEW_VERSION}
docker push localhost:5000/badmars_proxy:v${NEW_VERSION}
echo "-----------------------------------------"
