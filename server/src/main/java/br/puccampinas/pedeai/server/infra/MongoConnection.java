package br.puccampinas.pedeai.server.infra;

import java.util.concurrent.TimeUnit;

import org.bson.Document;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.MongoException;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

public class MongoConnection implements AutoCloseable {

    public static final String DATABASE_NAME = "pedeai";

    private static final int SERVER_SELECTION_TIMEOUT_SECONDS = 2;

    private final MongoClient client;

    public MongoConnection(String uri) {
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(uri))
                .applyToClusterSettings(cluster ->
                        cluster.serverSelectionTimeout(SERVER_SELECTION_TIMEOUT_SECONDS, TimeUnit.SECONDS))
                .build();
        this.client = MongoClients.create(settings);
    }

    public MongoDatabase database() {
        return client.getDatabase(DATABASE_NAME);
    }

    public boolean isConnected() {
        try {
            database().runCommand(new Document("ping", 1));
            return true;
        } catch (MongoException e) {
            return false;
        }
    }

    @Override
    public void close() {
        client.close();
    }
}
