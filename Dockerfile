# syntax=docker/dockerfile:1

# Build: docker build -t devinbox .
# Run:   see docker/docker-compose.yml and docker/.env.example for the required environment variables.

# ---- Build: `dotnet publish` runs GenerateClients (C# + TS client) and PublishRunWebpack (npm install + build) ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
# Node is only needed by the csproj's PublishRunWebpack target
COPY --from=node:24-bookworm-slim /usr/local/ /usr/local/
WORKDIR /src
COPY . .
RUN dotnet tool restore \
    && dotnet publish DevInbox.Web/DevInbox.Web.csproj -c Release -o /app/publish -p:UseAppHost=false \
    && find /app/publish/wwwroot -name "*.map" -delete

# ---- Runtime: minimal Alpine ASP.NET image, non-root ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=true \
    DOTNET_EnableDiagnostics=0
COPY --from=build /app/publish ./
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "DevInbox.Web.dll"]
