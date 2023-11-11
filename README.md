## Informacje
Prosty czytnik ebooków. W chwili obecnej rozpoznawany jest tylko format EPUB i CBZ (Comic Book Archive).

## Problemy


## Do realizacji

- Priorytet: **wysoki** - Podmiana atrybutów href w zawartości strony tak by zmieniać je na ścieżki bezwzględne ze sprawdzeniem czy nie wychodzi się poza katalog tymczasowy (plik epub-utils.js funkcja podobna do replaceSrcPaths()), jeżeli mają protokuł HTTP lub HTTPS to otwierać je w nowym oknie przeglądarki (wszystko czego nie znajduje się w rozpakowanym katalogu jest adresem zewnętrznym)
- Priorytet: **wysoki** - pokazanie na której jest się stronie i ile jest wszystkich stron (teraz określenie liczby stron jest dziwne)
- Priorytet: **średni** - przejście do dowolnej strony
- Priorytet: **średni** - naciśnięcie na link do strony ma pozwolić na przejście na tę stronę i odpowiednio uaktualnić informację o tym która strona jest aktualnie pokazywana
- Priorytet: **średni** - zapamiętanie stanu aplikacji przy zamykaniu i jego odtworzenie na starcie (zawartość biblioteki, postęp czytanej książki, aktualny wygląd ekranu w tym położenie scrolli)
- Priorytet: **niski** - Obsługa formatu MOBI
- Priorytet: **niski** - Dodanie graficznych ikon do interfejsu użytkownika (opracowanie lepszego interfejsu użytkownika)
