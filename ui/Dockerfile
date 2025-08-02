# Use Node to build the React app
FROM node:22 as build

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Use nginx to serve the built React app
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]