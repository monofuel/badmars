#!/bin/bash
set -euo pipefail

export PROJECT_ID=badmars-1242

if [ ! -f ./version.txt ]; then
    echo 1 > ./version.txt
fi

VERSION=`cat ./version.txt`
NEW_VERSION=`echo ${VERSION} + 1 | bc`
echo "-----------------------------------------"
echo "Current version:  ${VERSION}"
echo "Next version:     ${NEW_VERSION}"
echo "-----------------------------------------"

echo $NEW_VERSION > ./version.txt

echo "Building images"
echo "-----------------------------------------"

docker build -t gcr.io/${PROJECT_ID}/badmars_node:v${NEW_VERSION} .
docker build -t gcr.io/${PROJECT_ID}/badmars_go:v${NEW_VERSION} -f ./Dockerfile-go .

echo "-----------------------------------------"
echo "Deploying images"
echo "-----------------------------------------"
gcloud docker -- push gcr.io/${PROJECT_ID}/badmars_node:v${NEW_VERSION}
gcloud docker -- push gcr.io/${PROJECT_ID}/badmars_go:v${NEW_VERSION}

cd k8s

echo "-----------------------------------------"
echo "updating pods"
echo "-----------------------------------------"
for f in *.yaml; do sed -e "s/\$VERSION/$VERSION/g" $f | kubectl apply -f -; done
