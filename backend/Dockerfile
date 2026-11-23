# Autor: Bruno Terra Silverio
# RA: 25022630
# Etapa 1: compila o backend com Maven e gera o .jar
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Baixa as dependências antes de copiar o código, para aproveitar o cache do Docker
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package && cp target/*.jar app.jar

# Etapa 2: imagem final só com o Java e o .jar, sem o Maven
FROM eclipse-temurin:17-jre
WORKDIR /app
# Roda com um usuário sem privilégios, não como root
RUN useradd --system --no-create-home pedeai
COPY --from=build /app/app.jar app.jar
USER pedeai
# Limita a memória do Java e usa o fuso de São Paulo
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Duser.timezone=America/Sao_Paulo"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
