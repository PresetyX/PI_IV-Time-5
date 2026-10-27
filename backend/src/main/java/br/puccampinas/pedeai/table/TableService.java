package br.puccampinas.pedeai.table;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.common.ResourceNotFoundException;

@Service
public class TableService {

    private final TableRepository tableRepository;

    public TableService(TableRepository tableRepository) {
        this.tableRepository = tableRepository;
    }

    public Table getActiveByToken(ObjectId storeId, String token) {
        return tableRepository.findByStoreIdAndToken(storeId, token)
                .filter(Table::active)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found or inactive"));
    }

    public Table getActiveByNumber(ObjectId storeId, int number) {
        return tableRepository.findByStoreIdAndNumber(storeId, number)
                .filter(Table::active)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found or inactive"));
    }
}
