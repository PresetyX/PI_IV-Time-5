/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import jakarta.validation.Valid;

/** Endpoints da comanda do cliente: abrir, entrar, conta, pedidos, rodada e chamados de garçom. */
@RestController
@RequestMapping("/api/tabs")
public class TabController {

    private final TabService tabService;
    private final BillService billService;
    private final OrderPlacementService orderPlacementService;
    private final RoundService roundService;
    private final OrderTrackingService orderTrackingService;
    private final WaiterCallService waiterCallService;
    private final PickupService pickupService;

    public TabController(TabService tabService, BillService billService,
            OrderPlacementService orderPlacementService, RoundService roundService,
            OrderTrackingService orderTrackingService, WaiterCallService waiterCallService,
            PickupService pickupService) {
        this.tabService = tabService;
        this.billService = billService;
        this.orderPlacementService = orderPlacementService;
        this.roundService = roundService;
        this.orderTrackingService = orderTrackingService;
        this.waiterCallService = waiterCallService;
        this.pickupService = pickupService;
    }

    /** Faz um pedido na comanda do cliente. */
    @PostMapping("/mine/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderPlacementService.PlacedOrder placeOrder(@AuthenticationPrincipal AuthenticatedUser guest,
            @Valid @RequestBody PlaceOrderRequest request) {
        return orderPlacementService.place(guest, request);
    }

    /** Acompanhamento de um pedido da comanda. */
    @GetMapping("/mine/orders/{orderId}")
    public OrderTrackingResponse trackOrder(@AuthenticationPrincipal AuthenticatedUser guest,
            @PathVariable String orderId) {
        return orderTrackingService.track(guest, orderId);
    }

    /** Retirada da comanda de balcão do cliente. */
    @GetMapping("/mine/pickup")
    public PickupResponse pickup(@AuthenticationPrincipal AuthenticatedUser guest) {
        return pickupService.mine(guest);
    }

    /** Chamados de garçom da comanda. */
    @GetMapping("/mine/calls")
    public List<WaiterCallResponse> calls(@AuthenticationPrincipal AuthenticatedUser guest) {
        return waiterCallService.callsOfMyTab(guest);
    }

    /** Chama o garçom com o motivo informado. */
    @PostMapping("/mine/calls")
    @ResponseStatus(HttpStatus.CREATED)
    public WaiterCallResponse callWaiter(@AuthenticationPrincipal AuthenticatedUser guest,
            @Valid @RequestBody WaiterCallRequest request) {
        return waiterCallService.call(guest, request.type());
    }

    /** Lista as comandas abertas da mesa do cliente. */
    @GetMapping
    public List<TabSummary> list(@AuthenticationPrincipal AuthenticatedUser guest) {
        return tabService.listOnMyTable(guest);
    }

    /** Abre uma comanda nova, com o cliente como dono. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TabResponse open(@AuthenticationPrincipal AuthenticatedUser guest) {
        return tabService.open(guest);
    }

    /** Comanda aberta de que o cliente faz parte. */
    @GetMapping("/mine")
    public TabResponse mine(@AuthenticationPrincipal AuthenticatedUser guest) {
        return tabService.mine(guest);
    }

    /** Conta da comanda, separada por pessoa. */
    @GetMapping("/mine/bill")
    public BillResponse bill(@AuthenticationPrincipal AuthenticatedUser guest) {
        return billService.billOfMyTab(guest);
    }

    /** Dados do "Mais uma rodada": último pedido e sugestões da mesa. */
    @GetMapping("/mine/round")
    public RoundResponse round(@AuthenticationPrincipal AuthenticatedUser guest) {
        return roundService.roundOfMyTab(guest);
    }

    /** Entra numa comanda da mesa usando o código de convite. */
    @PostMapping("/{tabId}/join")
    public TabResponse join(@AuthenticationPrincipal AuthenticatedUser guest, @PathVariable String tabId,
            @Valid @RequestBody JoinTabRequest request) {
        return tabService.join(guest, tabId, request.code());
    }

    /** Gera um novo código de convite. Só o dono pode. */
    @PostMapping("/{tabId}/code")
    public TabResponse newCode(@AuthenticationPrincipal AuthenticatedUser guest, @PathVariable String tabId) {
        return tabService.newCode(guest, tabId);
    }

    /** Remove um participante da comanda. Só o dono pode. */
    @DeleteMapping("/{tabId}/participants/{sessionId}")
    public TabResponse removeParticipant(@AuthenticationPrincipal AuthenticatedUser guest,
            @PathVariable String tabId, @PathVariable String sessionId) {
        return tabService.removeParticipant(guest, tabId, sessionId);
    }
}
