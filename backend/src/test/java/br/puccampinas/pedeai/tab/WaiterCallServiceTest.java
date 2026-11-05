package br.puccampinas.pedeai.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import com.mongodb.client.result.UpdateResult;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;

class WaiterCallServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");

    private final TabService tabService = mock(TabService.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final WaiterCallService service = new WaiterCallService(tabService, mongo, Clock.fixed(NOW, ZoneOffset.UTC));
    private final ObjectId storeId = new ObjectId();
    private final AuthenticatedUser guest = new AuthenticatedUser(new ObjectId(), storeId, "GUEST");
    private final AuthenticatedUser waiter = new AuthenticatedUser(new ObjectId(), storeId, "WAITER");
    private final Tab tab = new Tab(new ObjectId(), storeId, new ObjectId(), "TABLE", "Ana", guest.userId(), "CUSTOMER",
            null, null, List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);

    @BeforeEach
    void givenTab() {
        when(tabService.requireMyTab(guest)).thenReturn(tab);
    }

    @Test
    void pushesAnOpenCallWithTheReasonTheSalonShows() {
        givenStoredCalls();

        WaiterCallResponse call = service.call(guest, "CLOSE_BILL");

        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(any(Query.class), update.capture(), eq("tab"));
        Document pushed = (Document) ((Document) update.getValue().getUpdateObject().get("$push")).get("waiterCalls");
        assertEquals("Fechar a conta", pushed.getString("reason"));
        assertEquals("OPEN", pushed.getString("status"));
        assertEquals(pushed.getString("id"), call.id());
        assertEquals(NOW, call.createdAt());
    }

    @Test
    void doesNotRepeatACallThatIsStillWaiting() {
        givenStoredCalls(new Document("id", "c1").append("type", "QUESTION").append("reason", "Tirar uma dúvida")
                .append("status", "OPEN").append("createdAt", Date.from(NOW.minusSeconds(60))));

        WaiterCallResponse call = service.call(guest, "QUESTION");

        assertEquals("c1", call.id());
        verify(mongo, never()).updateFirst(any(Query.class), any(Update.class), eq("tab"));
    }

    @Test
    void rejectsUnknownReason() {
        assertThrows(InvalidRequestException.class, () -> service.call(guest, "DANCE"));
    }

    @Test
    void waiterResolvesAnOpenCall() {
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq("tab"))).thenReturn(UpdateResult.acknowledged(1, 1L, null));

        WaiterCallResponse call = service.resolve(waiter, tab.id().toHexString(), "c1");

        assertEquals("RESOLVED", call.status());
        assertEquals(NOW, call.resolvedAt());
    }

    @Test
    void answeringTwiceIsAConflictAndUnknownCallIsNotFound() {
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq("tab"))).thenReturn(UpdateResult.acknowledged(0, 0L, null));
        givenStoredCalls(new Document("id", "c1").append("status", "RESOLVED"));

        assertThrows(ConflictException.class, () -> service.resolve(waiter, tab.id().toHexString(), "c1"));
        assertThrows(ResourceNotFoundException.class, () -> service.resolve(waiter, tab.id().toHexString(), "c2"));
    }

    @Test
    void kitchenCannotAnswerCalls() {
        AuthenticatedUser kitchen = new AuthenticatedUser(new ObjectId(), storeId, "KITCHEN");

        assertThrows(ForbiddenException.class, () -> service.resolve(kitchen, tab.id().toHexString(), "c1"));
    }

    private void givenStoredCalls(Document... calls) {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab")))
                .thenReturn(new Document("_id", tab.id()).append("waiterCalls", List.of(calls)));
    }
}
