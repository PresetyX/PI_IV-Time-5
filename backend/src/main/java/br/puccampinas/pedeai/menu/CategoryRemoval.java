package br.puccampinas.pedeai.menu;

public record CategoryRemoval(String outcome, ManagementCategory category) {

    public static final String DELETED = "DELETED";
    public static final String HIDDEN = "HIDDEN";
}
