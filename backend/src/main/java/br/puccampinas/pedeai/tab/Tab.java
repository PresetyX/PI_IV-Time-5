/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Comanda de uma pessoa, gravada na coleção "tab". Quem abre é o dono; outras pessoas da mesa entram
 * com o código de convite e ficam em {@code participants}.
 *
 * @param mode TABLE (mesa) ou COUNTER (balcão)
 * @param joinCode código de convite de 4 dígitos, válido até {@code joinCodeExpiresAt}
 */
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

    /** Pessoa que entrou na comanda. Ao ser removida, não sai da lista: só ganha {@code removedAt}. */
    public record Participant(ObjectId sessionId, String name, Instant joinedAt, Instant removedAt) {

        /** Ainda está na comanda, ou seja, não foi removida pelo dono. */
        public boolean active() {
            return removedAt == null;
        }
    }

    /** Participantes da comanda, devolvendo lista vazia em vez de null. */
    public List<Participant> participantsOrEmpty() {
        return participants == null ? List.of() : participants;
    }

    /** Cópia da comanda com outra lista de participantes. */
    public Tab withParticipants(List<Participant> next) {
        return new Tab(id, storeId, tableId, mode, customerName, ownerSessionId, managedBy, joinCode,
                joinCodeExpiresAt, next, status, subtotalCents, serviceFeeCents, discountCents, totalCents,
                paidCents, openedAt);
    }

    /** Cópia da comanda com um novo código de convite e sua validade. */
    public Tab withJoinCode(String code, Instant expiresAt) {
        return new Tab(id, storeId, tableId, mode, customerName, ownerSessionId, managedBy, code, expiresAt,
                participants, status, subtotalCents, serviceFeeCents, discountCents, totalCents, paidCents,
                openedAt);
    }
}
