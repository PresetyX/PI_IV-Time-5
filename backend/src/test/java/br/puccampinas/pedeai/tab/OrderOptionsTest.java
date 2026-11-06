package br.puccampinas.pedeai.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.menu.Option;
import br.puccampinas.pedeai.menu.OptionGroup;
import br.puccampinas.pedeai.menu.Product;

class OrderOptionsTest {

    private final Product fries = new Product(new ObjectId(), new ObjectId(), new ObjectId(), "Batata frita", null,
            3200, null, null, true, null, false, 0, List.of(
                    new OptionGroup("Tamanho", true, 1, 1,
                            List.of(new Option("Meia porção", -1200), new Option("Porção inteira", 0))),
                    new OptionGroup("Molhos", false, 0, 2,
                            List.of(new Option("Cheddar", 500), new Option("Barbecue", 300), new Option("Alho", 200)))));

    @Test
    void sumsTheCatalogDeltas() {
        OrderOptions.Resolved resolved = OrderOptions.resolve(fries,
                List.of(choice("Tamanho", "Meia porção"), choice("Molhos", "Cheddar")));

        assertEquals(-700, resolved.deltaSumCents());
        assertEquals(List.of(-1200, 500), resolved.deltasCents());
        assertEquals(new Document("group", "Tamanho").append("label", "Meia porção").append("deltaCents", -1200),
                resolved.documents().get(0));
    }

    @Test
    void requiredGroupNeedsAChoice() {
        assertThrows(InvalidRequestException.class, () -> OrderOptions.resolve(fries, List.of()));
    }

    @Test
    void groupMaxIsRespected() {
        assertThrows(InvalidRequestException.class, () -> OrderOptions.resolve(fries, List.of(
                choice("Tamanho", "Porção inteira"), choice("Molhos", "Cheddar"), choice("Molhos", "Barbecue"),
                choice("Molhos", "Alho"))));
    }

    @Test
    void unknownGroupOrLabelIsRejected() {
        assertThrows(InvalidRequestException.class,
                () -> OrderOptions.resolve(fries, List.of(choice("Tamanho", "Gigante"))));
        assertThrows(InvalidRequestException.class, () -> OrderOptions.resolve(fries,
                List.of(choice("Tamanho", "Porção inteira"), choice("Bebida", "Suco"))));
    }

    @Test
    void repeatedOptionIsRejected() {
        assertThrows(InvalidRequestException.class, () -> OrderOptions.resolve(fries, List.of(
                choice("Tamanho", "Porção inteira"), choice("Molhos", "Cheddar"), choice("Molhos", "Cheddar"))));
    }

    @Test
    void tryResolveIsEmptyWhenTheCatalogChanged() {
        assertTrue(OrderOptions.tryResolve(fries, List.of(choice("Tamanho", "Gigante"))).isEmpty());
    }

    @Test
    void readsTheOptionsSavedInAnOrderItem() {
        Document item = new Document("options", List.of(
                new Document("group", "Tamanho").append("label", "Meia porção").append("deltaCents", -1200)));

        assertEquals(List.of(choice("Tamanho", "Meia porção")), OrderOptions.fromItem(item));
    }

    private static PlaceOrderRequest.SelectedOption choice(String group, String label) {
        return new PlaceOrderRequest.SelectedOption(group, label);
    }
}
