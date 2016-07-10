#!/bin/bash
#monofuel 2016

#before running this script, have kubectl installed and configured for a cluster.

#TODO
#in-progress
#this script will be an easy one-stop shop to set up badmars on kubernetes
#should automagically set everything up

#needs some extra magic for rethinkdb persistent storage

cd client
npm install
cd ..
cd server
npm install
cd ..

#host our own docker repo
DOCKER_REGISTRY=`docker ps | grep registry | wc -l`
if [ $DOCKER_REGISTRY -eq "1" ]; then
	echo "docker registry already running"
else
	echo "starting docker registry"
	docker run -d -p 5000:5000 --restart=always --name registry registry:2
fi

#build the images needed
docker build -t badmars/nodejs .

#deploy image
docker push localhost:5000/badmars/nodejs

#apply kubernetes configs
for yamlFile in kubernetes/*.yaml; do
	kubectl apply -f kubernetes/$yamlfile
done

kubectl get rc
kubectl get pods
