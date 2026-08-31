# Build context is the repo root's `backend/` folder (see .github/workflows/backend-container-build.yml).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first, isolated by csproj-only copy, so dependency layers cache across builds that only change code.
COPY src/HMS.Domain/HMS.Domain.csproj src/HMS.Domain/
COPY src/HMS.Application/HMS.Application.csproj src/HMS.Application/
COPY src/HMS.Infrastructure/HMS.Infrastructure.csproj src/HMS.Infrastructure/
COPY src/HMS.API/HMS.API.csproj src/HMS.API/
RUN dotnet restore src/HMS.API/HMS.API.csproj

COPY src/ src/
RUN dotnet publish src/HMS.API/HMS.API.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Azure Container Apps (and most container hosts) route traffic to whatever port the container listens on
# via this env var - Kestrel picks it up automatically through ASPNETCORE_URLS.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "HMS.API.dll"]
