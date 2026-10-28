package br.puccampinas.pedeai.report;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.payment.CashService;
import br.puccampinas.pedeai.payment.CommissionService;
import br.puccampinas.pedeai.store.StoreSettingsService;
import br.puccampinas.pedeai.user.TeamService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/management")
public class BackOfficeController {

    private final HistoryService historyService;
    private final CashService cashService;
    private final CommissionService commissionService;
    private final StoreSettingsService storeSettingsService;
    private final TeamService teamService;

    public BackOfficeController(HistoryService historyService, CashService cashService,
            CommissionService commissionService, StoreSettingsService storeSettingsService, TeamService teamService) {
        this.historyService = historyService;
        this.cashService = cashService;
        this.commissionService = commissionService;
        this.storeSettingsService = storeSettingsService;
        this.teamService = teamService;
    }

    public record OpenCashRequest(@Min(0) int openingFloatCents) {
    }

    public record WithdrawalRequest(@NotBlank @Size(max = 80) String reason, @Min(1) int amountCents) {
    }

    public record CloseCashRequest(Map<String, Integer> counted, @Size(max = 200) String note) {
    }

    @GetMapping("/tabs/closed")
    public HistoryService.History closedTabs(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "TODAY") String period, @RequestParam(required = false) String q) {
        return historyService.closedTabs(user, period, q);
    }

    @GetMapping("/cash")
    public CashService.CashView cash(@AuthenticationPrincipal AuthenticatedUser user) {
        return cashService.current(user);
    }

    @PostMapping("/cash/open")
    public CashService.CashView openCash(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody OpenCashRequest request) {
        return cashService.open(user, request.openingFloatCents());
    }

    @PostMapping("/cash/withdrawals")
    public CashService.CashView withdraw(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody WithdrawalRequest request) {
        return cashService.withdraw(user, request.reason(), request.amountCents());
    }

    @PostMapping("/cash/close")
    public Map<String, Object> closeCash(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody CloseCashRequest request) {
        return cashService.close(user, request.counted(), request.note());
    }

    @GetMapping("/commissions")
    public CommissionService.Report commissions(@AuthenticationPrincipal AuthenticatedUser user) {
        return commissionService.report(user);
    }

    @PostMapping("/commissions/pay")
    public CommissionService.Report payCommissions(@AuthenticationPrincipal AuthenticatedUser user) {
        return commissionService.markPaid(user);
    }

    @GetMapping("/store")
    public StoreSettingsService.Settings store(@AuthenticationPrincipal AuthenticatedUser user) {
        return storeSettingsService.get(user);
    }

    @PutMapping("/store")
    public StoreSettingsService.Settings updateStore(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody StoreSettingsService.UpdateSettingsRequest request) {
        return storeSettingsService.update(user, request);
    }

    @PostMapping("/team")
    @ResponseStatus(HttpStatus.CREATED)
    public TeamService.Invitation invite(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody TeamService.InviteRequest request) {
        return teamService.invite(user, request);
    }

    @PostMapping("/team/{userId}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String userId) {
        teamService.deactivate(user, userId);
    }
}
