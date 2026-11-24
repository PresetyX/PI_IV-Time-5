/*
 * Autor: Pedro Henrique Medeiros dos Reis
 * RA: 24801656
 */
package br.puccampinas.pedeai.auth;

import org.bson.types.ObjectId;

public record AuthenticatedUser(ObjectId userId, ObjectId storeId, String role) {
}
