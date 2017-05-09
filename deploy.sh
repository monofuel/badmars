#!/bin/bash
set -euo pipefail

export PROJECT_ID=badmars-1242

if [ ! -f ./version.txt ]; then
    echo 1 > ./version.txt
fi

VERSION=`cat ./version.txt`

if [ $# -gt 0 ] && [ $1 == 'build' ]; then


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


    # dev note: king.mono:5000 is my private docker repo
    # added as a insecure repo in /etc/sysconfig/docker
    #       INSECURE_REGISTRY='--insecure-registry king.mono:5000'
    # systemctl daemon-reload # not sure if this command is needed
    # service docker restart

    docker build -t king.mono:5000/${PROJECT_ID}/badmars_node:v${NEW_VERSION} .
    docker build -t king.mono:5000/${PROJECT_ID}/badmars_go:v${NEW_VERSION} -f ./Dockerfile-go .

    echo "-----------------------------------------"
    echo "Deploying images"
    echo "-----------------------------------------"
    docker push king.mono:5000/${PROJECT_ID}/badmars_node:v${NEW_VERSION}
    docker push king.mono:5000/${PROJECT_ID}/badmars_go:v${NEW_VERSION}
    echo "-----------------------------------------"
else
    echo "-----------------------------------------"
    echo "Current version:  ${VERSION}"
    echo "-----------------------------------------"

    echo "Skipping build (pass build as arg if you want to build)"
    echo "-----------------------------------------"
    NEW_VERSION=$VERSION
fi

cd k8s

echo "updating pods"
echo "-----------------------------------------"
for f in *.yaml; do sed -e "s/\$VERSION/$NEW_VERSION/g" $f | kubectl apply -f -; done

echo "-----------------------------------------"
kubectl get pods
echo "-----------------------------------------"
kubectl get hpa
echo "-----------------------------------------"