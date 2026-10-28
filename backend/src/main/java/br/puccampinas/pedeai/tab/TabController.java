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

@RestController
@RequestMapping("/api/tabs")
public class TabController {

    private final TabService tabService;
    private final BillService billService;
    private final OrderPlacementService orderPlacementService;

    public TabController(TabService tabService, BillService billService,
            OrderPlacementService orderPlacementService) {
        this.tabService = tabService;
        this.billService = billService;
        this.orderPlacementService = orderPlacementService;
    }

    @PostMapping("/mine/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderPlacementService.PlacedOrder placeOrder(@AuthenticationPrincipal AuthenticatedUser guest,
            @Valid @RequestBody PlaceOrderRequest request) {
        return orderPlacementService.place(guest, request);
    }

    @GetMapping
    public List<TabSummary> list(@AuthenticationPrincipal AuthenticatedUser guest) {
        return tabService.listOnMyTable(guest);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TabResponse open(@AuthenticationPrincipal AuthenticatedUser guest) {
        return tabService.open(guest);
    }

    @GetMapping("/mine")
    public TabResponse mine(@AuthenticationPrincipal AuthenticatedUser guest) {
        return tabService.mine(guest);
    }

    @GetMapping("/mine/bill")
    public BillResponse bill(@AuthenticationPrincipal AuthenticatedUser guest) {
        return billService.billOfMyTab(guest);
    }

    @PostMapping("/{tabId}/join")
    public TabResponse join(@AuthenticationPrincipal AuthenticatedUser guest, @PathVariable String tabId,
            @Valid @RequestBody JoinTabRequest request) {
        return tabService.join(guest, tabId, request.code());
    }

    @PostMapping("/{tabId}/code")
    public TabResponse newCode(@AuthenticationPrincipal AuthenticatedUser guest, @PathVariable String tabId) {
        return tabService.newCode(guest, tabId);
    }

    @DeleteMapping("/{tabId}/participants/{sessionId}")
    public TabResponse removeParticipant(@AuthenticationPrincipal AuthenticatedUser guest,
            @PathVariable String tabId, @PathVariable String sessionId) {
        return tabService.removeParticipant(guest, tabId, sessionId);
    }
}
