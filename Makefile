include .env

image:
	docker image build --tag api-browser:main .

push:
	docker tag api-browser:main ${IMAGE_REGISTRY}/api-browser:main && docker push ${IMAGE_REGISTRY}/api-browser:main

sk-run:
	SKAFFOLD_DEFAULT_REPO=${IMAGE_REGISTRY} skaffold run


helm-install:
	helm install --set imageRegistry=${IMAGE_REGISTRY} api-browser ./chart

helm-uninstall:
	helm uninstall api-browser
