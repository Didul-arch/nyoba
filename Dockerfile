# --- build: install semua deps, build, lalu buang devDependencies ---
FROM node:22.22.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npx -y npm@11 ci
COPY . .
RUN npm run build && npx -y npm@11 prune --omit=dev

# --- runtime: cuma hasil build + deps produksi + git (buat riwayat vault) ---
FROM node:22.22.0-bookworm-slim
RUN apt-get update \
	&& apt-get install -y --no-install-recommends git \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000 \
	VAULT_PATH=/data/vault \
	DATA_PATH=/data/db \
	PROTOCOL_HEADER=x-forwarded-proto \
	HOST_HEADER=x-forwarded-host \
	ADDRESS_HEADER=x-forwarded-for \
	XFF_DEPTH=1
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s \
	CMD node -e "fetch('http://127.0.0.1:3000/login').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# Sinyal stop diterusin lewat `init: true` di compose, biar commit terakhir sempat jalan.
CMD ["node", "build"]
