package br.puccampinas.pedeai.mesa;

import br.puccampinas.pedeai.mesa.dto.AbrirMesaRequest;
import br.puccampinas.pedeai.mesa.dto.MesaResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mesas")
public class MesaController {

    private final MesaService mesaService;

    public MesaController(MesaService mesaService) {
        this.mesaService = mesaService;
    }

    @PostMapping("/abrir")
    @PreAuthorize("hasAnyAuthority('DONO','GERENTE','GARCOM')")
    public MesaResponse abrir(@Valid @RequestBody AbrirMesaRequest request) {
        return mesaService.abrirMesa(request);
    }

    @PostMapping("/{estabelecimentoId}/{numero}/encerrar")
    @PreAuthorize("hasAnyAuthority('DONO','GERENTE','GARCOM','CAIXA')")
    public MesaResponse encerrar(
            @PathVariable String estabelecimentoId,
            @PathVariable int numero
    ) {
        return mesaService.encerrarMesa(estabelecimentoId, numero);
    }
}
