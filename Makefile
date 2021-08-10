IMAGE_REPOSITORY=localhost:32000/api-browser
IMAGE_TAG=main
DEPLOYMENT_HOST=localhost
RELEASE_NAME=api-browser

-include .env

image:
	docker image build --tag ${IMAGE_REPOSITORY}:${IMAGE_TAG} .

push:
	docker push ${IMAGE_REPOSITORY}:${IMAGE_TAG}

helm-install:
	helm install --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_TAG},deploymentHost=${DEPLOYMENT_HOST} ${RELEASE_NAME} ./chart

helm-upgrade:
	helm upgrade --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_TAG},deploymentHost=${DEPLOYMENT_HOST} ${RELEASE_NAME} ./chart

helm-uninstall:
	helm uninstall ${RELEASE_NAME}

sk-run:
	DEPLOYMENT_HOST=${DEPLOYMENT_HOST} skaffold run

sk-dev:
	DEPLOYMENT_HOST=${DEPLOYMENT_HOST} skaffold dev

sk-del:
	DEPLOYMENT_HOST=${DEPLOYMENT_HOST} skaffold delete
