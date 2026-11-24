/*
 * Autor: Pedro Henrique Medeiros dos Reis
 * RA: 24801656
 */
package br.puccampinas.pedeai.common;

import java.time.Instant;

public class AccountLockedException extends RuntimeException {

    private final Instant lockedUntil;

    public AccountLockedException(Instant lockedUntil) {
        super("Account locked until " + lockedUntil);
        this.lockedUntil = lockedUntil;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }
}
