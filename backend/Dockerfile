# syntax=docker/dockerfile:1.7
# =====================================================================
#  EniForum — API Spring Boot
#  Image finale : JRE 17 Alpine, utilisateur non-root, jar découpé en couches
# =====================================================================

# ---------- 1. Build (Maven) ----------
FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /build
# Dépendances d'abord : couche réutilisée tant que pom.xml ne change pas
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package \
 && cp target/*.jar app.jar \
 && java -Djarmode=layertools -jar app.jar extract --destination extracted

# ---------- 2. Exécution ----------
FROM eclipse-temurin:17-jre-alpine
LABEL org.opencontainers.image.title="eniforum-backend" \
      org.opencontainers.image.description="API REST Spring Boot de la plateforme EniForum" \
      org.opencontainers.image.source="https://github.com/fatmaBouajla/eniforum"

RUN addgroup -S app && adduser -S -G app -h /app app
WORKDIR /app

# Couches du moins au plus souvent modifié (meilleur cache)
COPY --from=build /build/extracted/dependencies/ ./
COPY --from=build /build/extracted/spring-boot-loader/ ./
COPY --from=build /build/extracted/snapshot-dependencies/ ./
COPY --from=build /build/extracted/application/ ./

# CV déposés et logs : seuls dossiers inscriptibles
RUN mkdir -p uploads/cv logs && chown -R app:app uploads logs
USER app

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError" \
    CV_AI_BASE_URL="http://ai:8000"
EXPOSE 8081
VOLUME ["/app/uploads"]

HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 \
  CMD nc -z localhost 8081 || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
