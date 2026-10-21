#!/usr/bin/env bash
# Installe Growth Hub comme application de bureau (menu Applications + icône sur le Bureau).
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
LANCEUR="$HOME/.local/share/applications/growth-hub.desktop"
mkdir -p "$(dirname "$LANCEUR")"
cat > "$LANCEUR" <<FIN
[Desktop Entry]
Type=Application
Name=Growth Hub
Comment=Tâches, routine, statistiques et conseiller IA
Exec=/usr/bin/python3 "$ICI/growth_hub.py"
Icon=$ICI/web/icone.png
Terminal=false
Categories=Office;ProjectManagement;
StartupWMClass=growth-hub
FIN
chmod +x "$LANCEUR" "$ICI/growth_hub.py"
BUREAU="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
if [ -d "$BUREAU" ]; then
  cp "$LANCEUR" "$BUREAU/growth-hub.desktop"
  chmod +x "$BUREAU/growth-hub.desktop"
  gio set "$BUREAU/growth-hub.desktop" metadata::trusted true 2>/dev/null || true
fi
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
echo "Growth Hub est installé : cherche « Growth Hub » dans tes applications, ou double-clique l'icône du Bureau."
