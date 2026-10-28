package br.puccampinas.pedeai.table;

public record TableResponse(String token, int number, String nickname) {

    public static TableResponse of(Table table) {
        return new TableResponse(table.token(), table.number(), table.nickname());
    }
}
