# syntax=docker/dockerfile:1

FROM golang:1.27-alpine AS build
WORKDIR /src

COPY go.mod ./
RUN go mod tidy

COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/ncmaz-backend .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/ncmaz-backend /usr/local/bin/ncmaz-backend
EXPOSE 8090

# Optional: create a superuser at first boot.
# ENV PB_SUPERUSER_EMAIL=admin@example.com
# ENV PB_SUPERUSER_PASSWORD=change-me

ENTRYPOINT ["/usr/local/bin/ncmaz-backend"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/app/pb_data"]
