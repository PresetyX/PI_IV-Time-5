package br.puccampinas.pedeai.server.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;

final class Documents {

    private Documents() {
    }

    static Map<String, Object> toMap(Document document) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : document.entrySet()) {
            String key = "_id".equals(entry.getKey()) ? "id" : entry.getKey();
            result.put(key, convert(entry.getValue()));
        }
        return result;
    }

    private static Object convert(Object value) {
        if (value instanceof ObjectId id) {
            return id.toHexString();
        }
        if (value instanceof Date date) {
            return date.toInstant().toString();
        }
        if (value instanceof Document nested) {
            return toMap(nested);
        }
        if (value instanceof List<?> items) {
            List<Object> converted = new ArrayList<>();
            for (Object item : items) {
                converted.add(convert(item));
            }
            return converted;
        }
        return value;
    }
}
