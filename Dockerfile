FROM ghcr.io/bessazs/docker-images/node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# 1. Declarar que vamos receber esse argumento no momento do build
ARG VITE_API_URL 
# (Se você usa outra variável no seu código, como REACT_APP_API_URL, mude aqui)

# 2. Transformar o ARG em ENV para o npm run build conseguir enxergar
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM ghcr.io/bessazs/docker-images/node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]    
     
