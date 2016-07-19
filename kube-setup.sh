#!/bin/bash
#monofuel 2016

#before running this script, have kubectl installed and configured for a cluster.

#TODO
#in-progress
#this script will be an easy one-stop shop to set up badmars on kubernetes
#should automagically set everything up
#badmars/nodejs is for 'production' nodejs modules
#badmars/nodejs-dev is for mounting an NFS share for hot-reloading code

#needs some extra magic for rethinkdb persistent storage


echo "skipping install step for now"
#echo running install
#cd client
#npm install
#cd ..
#cd server
#npm install
#cd ..

#use minikube's docker host
#if we're using GKE, other magic would have to go here
echo evaluating minikube docker env
eval $(minikube docker-env)

echo building production image

#docker uploads the current working directory to the daemon
#which is painfully slow. so build in a subfolder with the 2 files needed
#for the production image. The production image pulls the latest
#stable code from github
cp server/package.json docker/server-package.json
cp client/package.json docker/client-package.json
cd docker
docker build -f Dockerfile -t badmars/nodejs:v6 .

echo building development image
docker build -f Dockerfile-dev -t badmars/nodejs-dev:v2 .
cd ..
#if we used GKE, we'd deploy it there

kubectl create secret generic oauthsecret --from-file=secrets/oauth.txt

echo deploying production replicas and services

kubectl create -f kubernetes/rethinkdb-replica.yaml

sleep 30s
#create kubernetes configs
FILES=kubernetes/*.yaml
for yamlFile in $FILES; do
	kubectl create -f kubernetes/$yamlfile &
done

kubectl delete hpa badmars-web
kubectl autoscale rc badmars-web --min 1 --max 4 --cpu-percent=80
kubectl delete hpa badmars-ai
kubectl autoscale rc badmars-ai --min 1 --max 8 --cpu-percent=80
kubectl delete hpa badmars-simulate
kubectl autoscale rc badmars-simulate --min 1 --max 2 --cpu-percent=80
kubectl delete hpa badmars-pathfinder
kubectl autoscale rc badmars-pathfinder --min 1 --max 4 --cpu-percent=80
kubectl delete hpa badmars-net
kubectl autoscale rc badmars-net --min 1 --max 8 --cpu-percent=80
kubectl delete hpa rethinkdb-proxy
kubectl autoscale rc rethinkdb-proxy --min 1 --max 5 --cpu-percent=80

echo deploying development replicas
FILES=kubernetes-dev/*.yaml
for yamlFile in $FILES; do
	kubectl create -f kubernetes-dev/$yamlfile &
done

kubectl get rc
kubectl get pods
