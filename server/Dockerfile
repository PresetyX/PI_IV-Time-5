# Autor: Bruno Terra Silverio
# RA: 25022630
# Etapa 1: compila o servidor de validação (Java puro) com Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Baixa as dependências antes de copiar o código, para aproveitar o cache do Docker
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package dependency:copy-dependencies -DoutputDirectory=target/lib \
    && mkdir -p target/lib && cp target/pedeai-server-*.jar app.jar

# Etapa 2: imagem final só com o Java e o .jar
FROM eclipse-temurin:17-jre
WORKDIR /app
# Roda com um usuário sem privilégios, não como root
RUN useradd --system --no-create-home pedeai
COPY --from=build /app/target/lib ./lib
COPY --from=build /app/app.jar ./app.jar
USER pedeai
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
# Porta do socket TCP que o backend usa para validar os pedidos
EXPOSE 5000
ENTRYPOINT ["java", "-cp", "app.jar:lib/*", "br.puccampinas.pedeai.server.ServerApplication"]
