package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("tab")
public record Tab(
        @Id ObjectId id,
        ObjectId storeId,
        ObjectId tableId,
        String mode,
        String customerName,
        ObjectId ownerSessionId,
        String managedBy,
        String joinCode,
        Instant joinCodeExpiresAt,
        List<Participant> participants,
        String status,
        int subtotalCents,
        int serviceFeeCents,
        int discountCents,
        int totalCents,
        int paidCents,
        Instant openedAt) {

    public record Participant(ObjectId sessionId, String name, Instant joinedAt, Instant removedAt) {

        public boolean active() {
            return removedAt == null;
        }
    }

    public List<Participant> participantsOrEmpty() {
        return participants == null ? List.of() : participants;
    }

    public Tab withParticipants(List<Participant> next) {
        return new Tab(id, storeId, tableId, mode, customerName, ownerSessionId, managedBy, joinCode,
                joinCodeExpiresAt, next, status, subtotalCents, serviceFeeCents, discountCents, totalCents,
                paidCents, openedAt);
    }

    public Tab withJoinCode(String code, Instant expiresAt) {
        return new Tab(id, storeId, tableId, mode, customerName, ownerSessionId, managedBy, code, expiresAt,
                participants, status, subtotalCents, serviceFeeCents, discountCents, totalCents, paidCents,
                openedAt);
    }
}
