FROM node:slim as build
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY ./ ./
RUN npm run build

FROM nginx:1.21-alpine
WORKDIR /usr/share/nginx/html
COPY  ./web ./
COPY --from=build /app/web/build ./build/
