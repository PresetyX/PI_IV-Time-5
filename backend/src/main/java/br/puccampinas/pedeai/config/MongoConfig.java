package br.puccampinas.pedeai.config;

import java.util.concurrent.TimeUnit;

import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MongoConfig {

    private static final int SERVER_SELECTION_TIMEOUT_SECONDS = 3;

    @Bean
    public MongoClientSettingsBuilderCustomizer serverSelectionTimeoutCustomizer() {
        return builder -> builder.applyToClusterSettings(
                cluster -> cluster.serverSelectionTimeout(SERVER_SELECTION_TIMEOUT_SECONDS, TimeUnit.SECONDS));
    }
}
