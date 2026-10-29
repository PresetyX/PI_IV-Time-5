package br.puccampinas.pedeai.report;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;

@RestController
@RequestMapping("/api/management")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/reports/summary")
    public ReportService.Summary summary(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "TODAY") String period) {
        return reportService.summary(user, period);
    }

    @GetMapping("/reports/abc")
    public ReportService.Abc abc(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "30") int days) {
        return reportService.abc(user, days);
    }

    @GetMapping("/team")
    public List<ReportService.TeamMember> team(@AuthenticationPrincipal AuthenticatedUser user) {
        return reportService.team(user);
    }
}
