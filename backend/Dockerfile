FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package && cp target/*.jar app.jar

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --no-create-home pedeai
COPY --from=build /app/app.jar app.jar
USER pedeai
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Duser.timezone=America/Sao_Paulo"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
