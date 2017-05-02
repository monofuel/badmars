#!/bin/bash
set -exuo pipefail

export PROJECT_ID=badmars-1242

#build and deploy images
#TODO update version numbers
docker build -t gcr.io/${PROJECT_ID}/badmars_node:v4 .
docker build -t gcr.io/${PROJECT_ID}/badmars_go:v8 -f ./Dockerfile-go .

gcloud docker -- push gcr.io/${PROJECT_ID}/badmars_node:v4
gcloud docker -- push gcr.io/${PROJECT_ID}/badmars_go:v8

cd k8s

for f in *.yaml; do kubectl apply -f $f; done
