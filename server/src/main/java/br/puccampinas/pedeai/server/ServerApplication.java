package br.puccampinas.pedeai.server;

import java.io.IOException;
import java.util.logging.Logger;

import br.puccampinas.pedeai.server.infra.MongoConnection;
import br.puccampinas.pedeai.server.infra.Settings;
import br.puccampinas.pedeai.server.infra.SocketServer;
import br.puccampinas.pedeai.server.protocol.ConnectionHandler;
import br.puccampinas.pedeai.server.repository.CategoryRepository;
import br.puccampinas.pedeai.server.repository.ProductRepository;
import br.puccampinas.pedeai.server.repository.TenantRepository;
import br.puccampinas.pedeai.server.service.MenuService;
import br.puccampinas.pedeai.server.service.TenantService;

public class ServerApplication {

    private static final Logger LOGGER = Logger.getLogger(ServerApplication.class.getName());

    public static void main(String[] args) throws IOException {
        Settings settings = Settings.fromEnvironment();
        MongoConnection mongo = new MongoConnection(settings.mongodbUri());

        TenantRepository tenantRepository = new TenantRepository(mongo.database());
        CategoryRepository categoryRepository = new CategoryRepository(mongo.database());
        ProductRepository productRepository = new ProductRepository(mongo.database());

        TenantService tenantService = new TenantService(tenantRepository);
        MenuService menuService = new MenuService(tenantRepository, categoryRepository, productRepository);

        SocketServer socketServer = new SocketServer(
                settings.socketPort(),
                socket -> new ConnectionHandler(socket, mongo, tenantService, menuService));

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            socketServer.stop();
            mongo.close();
        }));

        LOGGER.info("Listening on port " + settings.socketPort());
        socketServer.start();
    }
}
