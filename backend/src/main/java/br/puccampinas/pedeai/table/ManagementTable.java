package br.puccampinas.pedeai.table;

import java.time.Instant;

public record ManagementTable(
        String id,
        int number,
        String nickname,
        Integer seats,
        String token,
        boolean active,
        Instant createdAt,
        int openTabs) {

    public static ManagementTable of(Table table, int openTabs) {
        return new ManagementTable(table.id().toHexString(), table.number(), table.nickname(), table.seats(),
                table.token(), table.active(), table.createdAt(), openTabs);
    }
}
