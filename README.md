# CS2 Wingman Widget (OBS)

Widget do OBS (Browser Source) wyświetlający Twoją aktualną rangę Wingman (Skrzydłowy), ikonę rangi, bilans rang w sesji (+1/-1 ranga), K/D, AVG kille, Aim Rating oraz historię ostatnich meczów (W/L/T). Dane pobierane są na żywo z oficjalnego API Leetify.

---

## 🚀 Jak dodać na GitHub Pages (aby mieć widget online do edycji)

Postępuj zgodnie z poniższymi krokami, aby uruchomić stronę konfiguratora na swoim GitHubie:

### 1. Wypchnięcie projektu do Twojego repozytorium na GitHubie
Jeśli masz już repozytorium lub tworzysz nowe na [github.com/new](https://github.com/new):
```bash
git init
git add .
git commit -m "Convert CS2 widget to Wingman"
git branch -M main
git remote add origin https://github.com/TWOJ_NICK/cs2-wingman-widget.git
git push -u origin main
```

### 2. Włączenie GitHub Pages
1. Wejdź w swoje repozytorium na GitHubie.
2. Kliknij zakładkę **Settings** (Ustawienia).
3. W menu po lewej stronie wybierz **Pages**.
4. W sekcji **Build and deployment** -> **Source** wybierz:
   👉 **GitHub Actions** (zamiast "Deploy from a branch").
5. To wszystko! Workflow w `.github/workflows/deploy.yml` automatycznie zbuduje stronę i ją opublikuje.
6. Po 1–2 minutach w zakładce **Actions** zobaczysz zielony znaczek. Twoja strona będzie dostępna pod adresem:
   `https://TWOJ_NICK.github.io/cs2-wingman-widget/`

### 3. Jak korzystać z widgetu
1. Otwórz stronę GitHub Pages w przeglądarce.
2. Wklej swój **Steam64 ID** (znajdziesz go na [steamid.io](https://steamid.io)).
3. Wybierz opcje:
   - Wyświetlanie nazwy gracza
   - Wyświetlanie ikony rangi Wingmana (od Silver I do Global Elite)
   - Zmiana rang (+1 / -1 / ±0 ranga w wybranych meczach)
   - Statystyki (AVG zabójstw, K/D, Aim)
   - Historia meczów (W L W L)
   - Liczba ostatnich meczów do kalkulacji (3, 5, 8, 10)
4. Kliknij **Copy** przy wygenerowanym linku.
5. W OBS dodaj nowe źródło: **Przeglądarka (Browser Source)**:
   - Wklej skopiowany adres URL
   - Ustaw szerokość (Width): **520**
   - Ustaw wysokość (Height): **120**
   - Zaznacz przezroczyste tło (domyślnie widget jest już na przezroczystym tle)

---

## ⚡ Wymagania dotyczące konta Leetify
- Twoje konto na [leetify.com](https://leetify.com) musi być publiczne i połączone z kontem Steam.
- Aby mecze Wingman pojawiały się automatycznie po zakończeniu rozgrywki, upewnij się, że masz dodany kod Matchmaking Share Code na Leetify ([Leetify Data Sources](https://leetify.com/app/data-sources)).

---

## ⚙️ Opcjonalny klucz API (VITE_LEETIFY_KEY)
Widget działa out-of-the-box bez żadnego klucza. Jeśli jednak chcesz zwiększyć limity zapytań API Leetify:
1. Pobierz darmowy klucz na [leetify.com](https://leetify.com).
2. Na GitHubie wejdź w: **Settings** → **Secrets and variables** → **Actions**.
3. Dodaj Secret o nazwie: `VITE_LEETIFY_KEY`.
