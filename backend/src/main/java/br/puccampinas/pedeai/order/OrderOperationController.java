package br.puccampinas.pedeai.order;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** [Mateus · Card 4] Cancelar pedido com motivo e entrega parcial. A mudança de status segue no KitchenController. */
@RestController
@RequestMapping("/api/operations/orders")
public class OrderOperationController {

    private final OrderOperationService service;

    public OrderOperationController(OrderOperationService service) {
        this.service = service;
    }

    /** {@code reason}: GAVE_UP, WRONG_ORDER, OUT_OF_STOCK ou DUPLICATE. */
    public record CancelRequest(@NotBlank String reason, @Size(max = 140) String note) {
    }

    /** Posições dos itens na lista {@code items} do pedido. */
    public record DeliverRequest(@NotEmpty @Size(max = 50) List<@NotNull @Min(0) Integer> itemIndexes) {
    }

    @PostMapping("/{id}/cancel")
    public OrderOperationService.Result cancel(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String id, @Valid @RequestBody CancelRequest request) {
        return service.cancel(user, id, request.reason(), request.note());
    }

    @PostMapping("/{id}/deliver")
    public OrderOperationService.Result deliver(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String id, @Valid @RequestBody DeliverRequest request) {
        return service.deliver(user, id, request.itemIndexes());
    }

    /** [Mateus · Card 5] {@code method}: PIX_MANUAL, CASH, CARD_DEBIT ou CARD_CREDIT. */
    public record PayRequest(@NotBlank String method) {
    }

    /** [Mateus · Card 5] Pagamento no caixa de um pedido de balcão; solta o pedido para a cozinha. */
    @PostMapping("/{id}/pay")
    public OrderOperationService.Result pay(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String id, @Valid @RequestBody PayRequest request) {
        return service.pay(user, id, request.method());
    }
}
