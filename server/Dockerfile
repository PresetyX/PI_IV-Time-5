FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package dependency:copy-dependencies -DoutputDirectory=target/lib

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --no-create-home pedeai
COPY --from=build /app/target/lib ./lib
COPY --from=build /app/target/pedeai-server-*.jar ./app.jar
USER pedeai
EXPOSE 5000
ENTRYPOINT ["java", "-cp", "app.jar:lib/*", "br.puccampinas.pedeai.server.ServerApplication"]
