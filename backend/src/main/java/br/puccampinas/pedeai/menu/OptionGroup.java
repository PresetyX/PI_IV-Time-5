package br.puccampinas.pedeai.menu;

import java.util.List;

public record OptionGroup(String name, boolean required, int min, int max, List<Option> options) {
}
