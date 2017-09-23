#!/bin/bash
set -euo pipefail
set -x

echo killing all kubectl port forwards
ps aux | grep 'kubectl port-forward' | grep -v grep | awk '{print $2}' | xargs -r kill -9 || true
# minikube start --cpus 4 --memory 8192

echo waiting for minikube to start
while ! echo exit | curl `minikube dashboard --url` > /dev/null ; do sleep 1; done
echo minikube ready at `minikube dashboard --url`

echo prepare registry
kubectl apply -f k8s/registry.yml

# wait for registry pod to be ready
kubectl exec -n kube-system $(kubectl get po -n kube-system | grep kube-registry-v0 -m 1 | \
	awk '{print $1;}') -- /bin/echo

kubectl port-forward -n kube-system \
	$(kubectl get po -n kube-system | grep kube-registry-v0 | \
	awk '{print $1;}') 5000:5000 2>&1 > /dev/null &

echo building and deploying images
bash ./build_images.sh

VERSION=`cat ./version.txt`

echo applying deployments
for f in k8s/*.yaml; do sed -e "s/\$VERSION/$VERSION/g" $f | kubectl apply -f -; done

# wait for nginx pod to be ready
# kubectl exec  $(kubectl get po | grep nginx-deployment -m 1 | \
# 	awk '{print $1;}') -- /bin/echo

echo expose services
kubectl port-forward \
	$(kubectl get po | grep rethinkdb-deployment | \
	awk '{print $1;}') 8080:8080 2>&1 > /dev/null &

# TODO should expose rethinkdb + admin dashboard via nginx
# TODO should run on port 443 with dev credentials
echo exposing nginx
kubectl port-forward \
	$(kubectl get po | grep nginx-deployment | \
	awk '{print $1;}') 8000:80 2>&1 > /dev/null &
