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

echo skipping install step for now
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
#build the images needed
docker build -t badmars/nodejs .

echo building development image
docker build -f Dockerfile-dev -t badmars/nodejs-dev .

#if we used GKE, we'd deploy it there

echo deploying production replicas and services
#create kubernetes configs
for yamlFile in kubernetes/*.yaml; do
	kubectl create -f kubernetes/$yamlfile
done

echo deploying development replicas
for yamlFile in kubernetes-dev/*.yaml; do
	kubectl create -f kubernetes/$yamlfile
done

kubectl get rc
kubectl get pods
